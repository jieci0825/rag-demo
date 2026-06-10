import { BadGatewayError } from '../../lib/errors.js'
import { log } from '../../lib/logger.js'
import { createLlmProvider } from '../../rag-core/llm/index.js'
import { createQueryLog } from '../query-logs/query-logs.repository.js'
import {
    QUERY_TRANSFORM_FORMAT,
    QUERY_TRANSFORM_SYSTEM_PROMPT,
} from './query-transform.config.js'
import { queryTransformOutputSchema } from './retrieval.schema.js'

import type { LlmProvider } from '../../rag-core/llm/index.js'
import type {
    QueryTransformOutput,
    TransformQueryBody,
} from './retrieval.schema.js'

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
 * 调用 LLM 选择并执行查询转换，将上游或输出校验错误转换为 502。
 */
async function generateQueryTransform(
    query: string,
    model: string,
    llmProvider: LlmProvider
): Promise<QueryTransformOutput> {
    try {
        const output = await llmProvider.generateStructuredOutput(model, {
            messages: [
                {
                    role: 'system',
                    content: QUERY_TRANSFORM_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: query,
                },
            ],
            format: QUERY_TRANSFORM_FORMAT,
        })

        return queryTransformOutputSchema.parse(output)
    } catch {
        throw new BadGatewayError('Query transform service failed')
    }
}

export type QueryTransformResult = QueryTransformOutput & {
    originalQuery: string
}
