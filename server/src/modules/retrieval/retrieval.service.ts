import { ERROR_DEFINITIONS } from '../../constants/error-definitions.js'
import { AppError } from '../../lib/errors.js'
import { log } from '../../lib/logger.js'
import { createLlmProvider } from '../../rag-core/llm/index.js'
import { createQueryLog } from '../query-logs/query-logs.repository.js'
import {
    QUERY_TRANSFORM_FORMAT,
    QUERY_TRANSFORM_SYSTEM_PROMPT,
} from './query-transform.config.js'
import { queryTransformOutputSchema } from './retrieval.schema.js'

import type { LlmMessage, LlmProvider } from '../../rag-core/llm/index.js'
import type {
    QueryTransformOutput,
    TransformQueryBody,
} from './retrieval.schema.js'

const MAX_QUERY_TRANSFORM_RETRIES = 2
const MAX_QUERY_TRANSFORM_ATTEMPTS = MAX_QUERY_TRANSFORM_RETRIES + 1

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
 * 调用 LLM 生成查询转换结果，并针对 Zod 校验问题最多定向修复两次。
 */
async function generateQueryTransform(
    query: string,
    model: string,
    llmProvider: LlmProvider
): Promise<QueryTransformOutput> {
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

    for (let attempt = 1; attempt <= MAX_QUERY_TRANSFORM_ATTEMPTS; attempt += 1) {
        let output: unknown

        try {
            output = await llmProvider.generateStructuredOutput(model, {
                messages: [...messages],
                format: QUERY_TRANSFORM_FORMAT,
            })
        } catch (error) {
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

        const validationResult = queryTransformOutputSchema.safeParse(output)

        if (validationResult.success) {
            return validationResult.data
        }

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
            },
        )

        if (retriesRemaining === 0) {
            throw new AppError(ERROR_DEFINITIONS.QUERY_TRANSFORM_FAILED)
        }

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
            },
        )
    }

    throw new AppError(ERROR_DEFINITIONS.QUERY_TRANSFORM_FAILED)
}

export type QueryTransformResult = QueryTransformOutput & {
    originalQuery: string
}
