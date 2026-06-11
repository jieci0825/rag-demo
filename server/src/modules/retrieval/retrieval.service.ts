import { ERROR_DEFINITIONS } from '../../constants/error-definitions.js'
import { AppError } from '../../lib/errors.js'
import { log } from '../../lib/logger.js'
import { createQwenEmbeddingProvider } from '../../rag-core/embeddings/qwen-embedding.provider.js'
import { createLlmProvider } from '../../rag-core/llm/index.js'
import { createHttpRerankerProvider } from '../../rag-core/rerankers/index.js'
import { createQueryLog } from '../query-logs/query-logs.repository.js'
import {
    QUERY_TRANSFORM_FORMAT,
    QUERY_TRANSFORM_SYSTEM_PROMPT,
} from './query-transform.config.js'
import {
    searchChunksByKeyword,
    searchChunksByVector,
} from './retrieval.repository.js'
import { queryTransformOutputSchema } from './retrieval.schema.js'
import { selectFusedResults } from './result-fusion.js'
import {
    selectRerankedResults,
    toRrfResults,
} from './result-reranking.js'

import type { EmbeddingProvider } from '../../rag-core/embeddings/embedding.provider.js'
import type { LlmMessage, LlmProvider } from '../../rag-core/llm/index.js'
import type { RerankerProvider } from '../../rag-core/rerankers/index.js'
import type { RankedRetrievalList } from './result-fusion.js'
import type { RetrievalResult } from './result-reranking.js'
import type {
    QueryTransformOutput,
    SearchKnowledgeBaseBody,
    TransformQueryBody,
} from './retrieval.schema.js'

const MAX_QUERY_TRANSFORM_RETRIES = 2
const MAX_QUERY_TRANSFORM_ATTEMPTS = MAX_QUERY_TRANSFORM_RETRIES + 1
const MIN_RETRIEVAL_CANDIDATE_LIMIT = 20

/**
 * 使用 LLM 选择查询转换策略、生成查询，并在成功后持久化日志。
 */
export async function transformQuery(
    input: TransformQueryBody,
    llmProvider = createLlmProvider(input.provider)
): Promise<QueryTransformResult> {
    const normalizedQuery = input.query.trim()
    const startedAt = Date.now()
    const transformOutput = await generateQueryTransform(
        normalizedQuery,
        input.model,
        llmProvider
    )
    const latencyMs = Date.now() - startedAt

    await createQueryLog({
        queryText: input.query,
        queryTransforms: {
            strategy: transformOutput.strategy,
            queries: transformOutput.queries,
        },
        queryEmbedding: null,
        topK: null,
        retrievedChunks: null,
        latencyMs,
    })

    log('info', 'Query transform completed', {
        module: 'retrieval',
        operation: 'query-transform',
        provider: input.provider,
        model: input.model,
        queryLength: input.query.length,
        strategy: transformOutput.strategy,
        transformedQueryCount: transformOutput.queries.length,
        durationMs: latencyMs,
    })

    return {
        originalQuery: input.query,
        ...transformOutput,
    }
}

/**
 * 对转换后的查询执行混合召回、RRF 候选融合和 Cross-Encoder 重排。
 */
export async function searchKnowledgeBase(
    input: SearchKnowledgeBaseBody,
    llmProvider = createLlmProvider(input.provider),
    embeddingProvider = createQwenEmbeddingProvider(),
    rerankerProvider = createHttpRerankerProvider(),
): Promise<SearchKnowledgeBaseResult> {
    const startedAt = Date.now()
    const normalizedQuery = input.query.trim()

    // 查询转换只在当前链路中执行，不额外写入仅包含转换阶段的日志。
    const transformOutput = await generateQueryTransform(
        normalizedQuery,
        input.model,
        llmProvider,
    )
    const queries = getUniqueQueries(transformOutput.queries)
    const embeddings = await embeddingProvider.embedTexts(queries)
    const candidateLimit = Math.max(
        MIN_RETRIEVAL_CANDIDATE_LIMIT,
        input.topK,
    )

    // 每条转换查询分别并行执行两种召回，所有排名列表交由统一融合逻辑处理。
    const queryRankedLists = await Promise.all(
        queries.map(async (query, index): Promise<RankedRetrievalList[]> => {
            const [vectorResults, keywordResults] = await Promise.all([
                searchChunksByVector(embeddings[index], candidateLimit),
                searchChunksByKeyword(query, candidateLimit),
            ])

            return [
                {
                    query,
                    channel: 'vector',
                    results: vectorResults,
                },
                {
                    query,
                    channel: 'keyword',
                    results: keywordResults,
                },
            ]
        }),
    )
    const rankedLists = queryRankedLists.flat()
    const candidates = selectFusedResults(
        transformOutput.strategy,
        rankedLists,
        candidateLimit,
    )
    const rerankOutcome = await rerankCandidates(
        transformOutput.strategy,
        queries,
        candidates,
        rankedLists,
        input.topK,
        rerankerProvider,
    )
    const latencyMs = Date.now() - startedAt

    await createQueryLog({
        queryText: input.query,
        queryTransforms: transformOutput,
        queryEmbedding: embeddings[0] ?? null,
        topK: input.topK,
        retrievedChunks: rerankOutcome.results,
        latencyMs,
    })

    log('info', 'Hybrid retrieval completed', {
        module: 'retrieval',
        operation: 'hybrid-search',
        provider: input.provider,
        model: input.model,
        strategy: transformOutput.strategy,
        transformedQueryCount: queries.length,
        rankedListCount: rankedLists.length,
        candidateCount: candidates.length,
        resultCount: rerankOutcome.results.length,
        rerankApplied: rerankOutcome.applied,
        topK: input.topK,
        durationMs: latencyMs,
    })

    return {
        originalQuery: input.query,
        ...transformOutput,
        topK: input.topK,
        rerankApplied: rerankOutcome.applied,
        results: rerankOutcome.results,
    }
}

/**
 * 调用 LLM 生成查询转换结果，并针对 Zod 校验问题最多定向修复两次。
 */
async function generateQueryTransform(
    query: string,
    model: string,
    llmProvider: LlmProvider
): Promise<QueryTransformOutput> {
    // 构建初始消息
    const messages: LlmMessage[] = [
        {
            role: 'system',
            content: QUERY_TRANSFORM_SYSTEM_PROMPT,
        },
        {
            role: 'user',
            content: query,
        },
    ]

    // 最多尝试 MAX_QUERY_TRANSFORM_ATTEMPTS 次调用 LLM 生成符合结构要求的输出
    for (
        let attempt = 1;
        attempt <= MAX_QUERY_TRANSFORM_ATTEMPTS;
        attempt += 1
    ) {
        let output: unknown

        try {
            // 调用 llm 得到 query transform 输出
            output = await llmProvider.generateStructuredOutput(model, {
                messages: [...messages],
                format: QUERY_TRANSFORM_FORMAT,
            })
        } catch (error) {
            // 如果是大模型调用错误，则记录详细日志并终止重试
            log('error', 'Query transform LLM request failed', {
                module: 'retrieval',
                operation: 'query-transform',
                model,
                attempt,
                maxAttempts: MAX_QUERY_TRANSFORM_ATTEMPTS,
                messages: [...messages],
                err: error,
            })
            throw new AppError(ERROR_DEFINITIONS.QUERY_TRANSFORM_FAILED)
        }

        // 使用 Zod 校验输出结构，如果校验失败则根据校验错误定向修复后重试
        const validationResult = queryTransformOutputSchema.safeParse(output)

        // 如果校验成功则直接返回结果
        if (validationResult.success) {
            return validationResult.data
        }

        // 如果校验失败且还有重试机会，则记录警告日志并构造定向修复提示后继续重试
        const retriesRemaining = MAX_QUERY_TRANSFORM_ATTEMPTS - attempt

        log(
            retriesRemaining > 0 ? 'warn' : 'error',
            'Query transform output validation failed',
            {
                module: 'retrieval',
                operation: 'query-transform',
                model,
                attempt,
                maxAttempts: MAX_QUERY_TRANSFORM_ATTEMPTS,
                retriesRemaining,
                messages: [...messages],
                output,
                zodIssues: validationResult.error.issues,
            }
        )

        // 如果没有重试机会了，则抛出统一的错误
        if (retriesRemaining === 0) {
            throw new AppError(ERROR_DEFINITIONS.QUERY_TRANSFORM_FAILED)
        }

        // 重试前在消息中添加定向修复提示，指导 LLM 根据 Zod 校验错误修正输出
        messages.push(
            {
                role: 'assistant',
                content: JSON.stringify(output),
            },
            {
                role: 'user',
                content: [
                    '上一次输出未通过结构校验。',
                    '请根据以下 Zod 校验问题修正，并仅返回完整的 JSON 对象：',
                    JSON.stringify(validationResult.error.issues),
                ].join('\n'),
            }
        )
    }

    throw new AppError(ERROR_DEFINITIONS.QUERY_TRANSFORM_FAILED)
}

/**
 * 按首次出现顺序移除重复查询，避免重复召回被 RRF 重复加权。
 */
function getUniqueQueries(queries: string[]): string[] {
    return [...new Set(queries)]
}

/**
 * 调用 Cross-Encoder 重排候选，失败时按原有 RRF 规则降级。
 */
async function rerankCandidates(
    strategy: QueryTransformOutput['strategy'],
    queries: string[],
    candidates: ReturnType<typeof selectFusedResults>,
    rankedLists: RankedRetrievalList[],
    topK: number,
    rerankerProvider: RerankerProvider,
): Promise<RerankOutcome> {
    if (candidates.length === 0) {
        return {
            applied: false,
            results: [],
        }
    }

    try {
        const rerankResult = await rerankerProvider.rerank({
            queries,
            documents: candidates.map(candidate => ({
                chunkId: candidate.chunkId,
                text: candidate.searchText,
            })),
        })

        return {
            applied: true,
            results: selectRerankedResults(
                strategy,
                queries,
                candidates,
                rerankResult,
                topK,
            ),
        }
    } catch (error) {
        // Reranker 不影响基础检索可用性，记录失败上下文后回退到 RRF。
        log('warn', 'Reranker request failed, using RRF results', {
            module: 'retrieval',
            operation: 'rerank',
            strategy,
            queryCount: queries.length,
            candidateCount: candidates.length,
            topK,
            err: error,
        })

        return {
            applied: false,
            results: toRrfResults(
                selectFusedResults(strategy, rankedLists, topK),
            ),
        }
    }
}

export type QueryTransformResult = QueryTransformOutput & {
    originalQuery: string
}

export type SearchKnowledgeBaseResult = QueryTransformResult & {
    topK: number
    rerankApplied: boolean
    results: RetrievalResult[]
}

interface RerankOutcome {
    applied: boolean
    results: RetrievalResult[]
}
