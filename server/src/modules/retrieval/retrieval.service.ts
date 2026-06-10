import { BadGatewayError } from '../../lib/errors.js'
import { log } from '../../lib/logger.js'
import { createLlmProvider } from '../../rag-core/llm/index.js'
import { createQueryLog } from '../query-logs/query-logs.repository.js'
import { rewrittenQuerySchema } from './retrieval.schema.js'

import type { LlmProvider } from '../../rag-core/llm/index.js'
import type { TransformQueryBody } from './retrieval.schema.js'

const QUERY_REWRITE_SYSTEM_PROMPT = [
    '你将用户查询重写为清晰、独立的查询，以适用于知识库检索。',
    '只重写查询。不要回答查询。',
    '保留原始意图、实体、数字、时间引用、否定和约束条件。',
    '不要添加原始查询中不存在的信息或条件。',
    '使用与原始查询相同的语言，并保留必要的技术术语。',
    '如果查询已经适合用于检索，则原样返回。',
].join('\n')

const QUERY_REWRITE_FORMAT = {
    type: 'object',
    properties: {
        rewrittenQuery: {
            type: 'string',
            minLength: 1,
        },
    },
    required: ['rewrittenQuery'],
    additionalProperties: false,
}

/**
 * 使用 LLM 改写查询，并在成功后持久化改写日志。
 */
export async function transformQuery(
    input: TransformQueryBody,
    llmProvider = createLlmProvider(input.provider),
): Promise<QueryTransformResult> {
    const normalizedQuery = input.query.trim()
    const startedAt = Date.now()
    const rewrittenQuery = await rewriteQuery(
        normalizedQuery,
        input.model,
        llmProvider,
    )
    const latencyMs = Date.now() - startedAt

    await createQueryLog({
        queryText: input.query,
        queryTransforms: {
            rewrite: {
                query: rewrittenQuery,
            },
        },
        queryEmbedding: null,
        topK: null,
        retrievedChunks: null,
        latencyMs,
    })

    log('info', 'Query rewrite completed', {
        module: 'retrieval',
        operation: 'query-transform',
        provider: input.provider,
        model: input.model,
        queryLength: input.query.length,
        rewrittenQueryLength: rewrittenQuery.length,
        durationMs: latencyMs,
    })

    return {
        originalQuery: input.query,
        rewrittenQuery,
    }
}

/**
 * 调用 LLM 完成查询改写，并将上游或输出校验错误转换为 502。
 */
async function rewriteQuery(
    query: string,
    model: string,
    llmProvider: LlmProvider,
): Promise<string> {
    try {
        const output = await llmProvider.generateStructuredOutput(model, {
            messages: [
                // 内置的系统提示词。通过 prompt 来进行一些约束，提升输出质量和稳定性。
                {
                    role: 'system',
                    content: QUERY_REWRITE_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: query,
                },
            ],
            format: QUERY_REWRITE_FORMAT,
        })
        const result = rewrittenQuerySchema.parse(output)

        return result.rewrittenQuery
    } catch {
        throw new BadGatewayError('Query rewrite service failed')
    }
}

export interface QueryTransformResult {
    originalQuery: string
    rewrittenQuery: string
}
