import { z } from 'zod'

import { env } from '../../config/env.js'

import type {
    RerankRequest,
    RerankResult,
    RerankerProvider,
} from './reranker.provider.js'

const rerankResponseSchema = z.object({
    model: z.string().min(1),
    results: z.array(z.object({
        chunkId: z.number().int(),
        scores: z.array(z.number().finite()),
    })),
})

/**
 * 创建通过 HTTP 调用本地 Cross-Encoder 服务的 Reranker Provider。
 */
export function createHttpRerankerProvider(): RerankerProvider {
    return {
        rerank: requestRerank,
    }
}

/**
 * 请求本地 Reranker 服务并校验候选与评分矩阵完整性。
 */
async function requestRerank(
    request: RerankRequest,
): Promise<RerankResult> {
    const response = await fetch(`${env.RERANKER_BASE_URL}/rerank`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(env.RERANKER_TIMEOUT_MS),
    })

    if (!response.ok) {
        throw new Error(
            `Reranker request failed with status ${response.status}`,
        )
    }

    const result = rerankResponseSchema.parse(await response.json())

    validateRerankResult(request, result)

    return result
}

/**
 * 确认响应完整覆盖请求 chunks，且每个 chunk 都包含全部查询的分数。
 */
function validateRerankResult(
    request: RerankRequest,
    result: RerankResult,
): void {
    if (result.results.length !== request.documents.length) {
        throw new Error('Reranker response document count does not match request')
    }

    const requestedChunkIds = new Set(
        request.documents.map(document => document.chunkId),
    )
    const responseChunkIds = new Set<number>()

    for (const item of result.results) {
        if (
            !requestedChunkIds.has(item.chunkId)
            || responseChunkIds.has(item.chunkId)
        ) {
            throw new Error('Reranker response contains invalid chunk IDs')
        }

        if (item.scores.length !== request.queries.length) {
            throw new Error('Reranker response score count does not match queries')
        }

        responseChunkIds.add(item.chunkId)
    }
}
