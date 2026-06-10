import { BadGatewayError } from '../../lib/errors.js'
import { createDeepSeekLlmProvider } from '../../rag-core/llm/index.js'
import { createQueryLog } from '../query-logs/query-logs.repository.js'
import { rewrittenQuerySchema } from './retrieval.schema.js'

import type { Logger } from 'pino'
import type { LlmProvider } from '../../rag-core/llm/index.js'

const QUERY_REWRITE_SYSTEM_PROMPT = [
    'You rewrite user queries into clear, standalone queries suitable for knowledge-base retrieval.',
    'Only rewrite the query. Do not answer it.',
    'Preserve the original intent, entities, numbers, time references, negations, and constraints.',
    'Do not add information or conditions that are not present in the original query.',
    'Use the same language as the original query and preserve necessary technical terms.',
    'If the query is already suitable for retrieval, return it unchanged.',
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
    originalQuery: string,
    requestLogger: Logger,
    llmProvider: LlmProvider = createDeepSeekLlmProvider(),
): Promise<QueryTransformResult> {
    const operationLogger = requestLogger.child({
        module: 'retrieval',
        operation: 'query-transform',
    })
    const normalizedQuery = originalQuery.trim()
    const startedAt = Date.now()
    const rewrittenQuery = await rewriteQuery(normalizedQuery, llmProvider)
    const latencyMs = Date.now() - startedAt

    await createQueryLog({
        queryText: originalQuery,
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

    operationLogger.info({
        queryLength: originalQuery.length,
        rewrittenQueryLength: rewrittenQuery.length,
        durationMs: latencyMs,
    }, 'Query rewrite completed')

    return {
        originalQuery,
        rewrittenQuery,
    }
}

/**
 * 调用 LLM 完成查询改写，并将上游或输出校验错误转换为 502。
 */
async function rewriteQuery(
    query: string,
    llmProvider: LlmProvider,
): Promise<string> {
    try {
        const output = await llmProvider.generateStructuredOutput({
            messages: [
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
