import type { RerankResult } from '../../rag-core/rerankers/index.js'
import type { QueryTransformOutput } from './retrieval.schema.js'
import type { FusedRetrievalResult } from './result-fusion.js'

export interface RetrievalResult {
    chunkId: number
    documentId: number
    chunkIndex: number
    content: string
    metadata: Record<string, unknown> | null
    rrfScore: number
    matches: FusedRetrievalResult['matches']
    rerankScore: number | null
    rerankQuery: string | null
}

interface ScoredCandidate {
    candidate: FusedRetrievalResult
    queryScores: number[]
    rerankScore: number
    rerankQuery: string
}

/**
 * 使用 Cross-Encoder 分数重排候选，并按查询策略选择最终 Top K。
 */
export function selectRerankedResults(
    strategy: QueryTransformOutput['strategy'],
    queries: string[],
    candidates: FusedRetrievalResult[],
    rerankResult: RerankResult,
    topK: number,
): RetrievalResult[] {
    const scoredCandidates = buildScoredCandidates(
        queries,
        candidates,
        rerankResult,
    )
    const sortedCandidates = [...scoredCandidates].sort(
        compareScoredCandidates,
    )

    if (strategy !== 'decomposition') {
        return sortedCandidates
            .slice(0, topK)
            .map(toRerankedResult)
    }

    const selectedChunkIds = selectDecompositionChunkIds(
        scoredCandidates,
        queries.length,
        topK,
    )

    for (const candidate of sortedCandidates) {
        if (selectedChunkIds.size >= topK) {
            break
        }

        selectedChunkIds.add(candidate.candidate.chunkId)
    }

    return sortedCandidates
        .filter(candidate => selectedChunkIds.has(candidate.candidate.chunkId))
        .slice(0, topK)
        .map(toRerankedResult)
}

/**
 * 将 RRF 候选转换为未执行重排的公开响应结构。
 */
export function toRrfResults(
    candidates: FusedRetrievalResult[],
): RetrievalResult[] {
    return candidates.map(candidate => ({
        chunkId: candidate.chunkId,
        documentId: candidate.documentId,
        chunkIndex: candidate.chunkIndex,
        content: candidate.content,
        metadata: candidate.metadata,
        rrfScore: candidate.rrfScore,
        matches: candidate.matches,
        rerankScore: null,
        rerankQuery: null,
    }))
}

/**
 * 将 Reranker 的评分矩阵关联回对应 RRF 候选。
 */
function buildScoredCandidates(
    queries: string[],
    candidates: FusedRetrievalResult[],
    rerankResult: RerankResult,
): ScoredCandidate[] {
    const scoresByChunkId = new Map(
        rerankResult.results.map(result => [result.chunkId, result.scores]),
    )

    return candidates.map((candidate) => {
        const queryScores = scoresByChunkId.get(candidate.chunkId)

        if (!queryScores) {
            throw new Error('Reranker result missing candidate chunk')
        }

        const bestQueryIndex = getBestQueryIndex(queryScores)

        return {
            candidate,
            queryScores,
            rerankScore: queryScores[bestQueryIndex],
            rerankQuery: queries[bestQueryIndex],
        }
    })
}

/**
 * 为每个拆解子查询优先保留其评分最高且尚未选择的候选。
 */
function selectDecompositionChunkIds(
    candidates: ScoredCandidate[],
    queryCount: number,
    topK: number,
): Set<number> {
    const selectedChunkIds = new Set<number>()

    for (let queryIndex = 0; queryIndex < queryCount; queryIndex += 1) {
        if (selectedChunkIds.size >= topK) {
            break
        }

        const candidate = [...candidates]
            .sort((left, right) => (
                right.queryScores[queryIndex] - left.queryScores[queryIndex]
                || compareScoredCandidates(left, right)
            ))
            .find(item => !selectedChunkIds.has(item.candidate.chunkId))

        if (candidate) {
            selectedChunkIds.add(candidate.candidate.chunkId)
        }
    }

    return selectedChunkIds
}

/**
 * 返回分数最高查询的索引，同分时保留转换查询中的首次出现顺序。
 */
function getBestQueryIndex(scores: number[]): number {
    let bestIndex = 0

    for (let index = 1; index < scores.length; index += 1) {
        if (scores[index] > scores[bestIndex]) {
            bestIndex = index
        }
    }

    return bestIndex
}

/**
 * 按重排分数、RRF 分数和 chunk ID 生成稳定排序。
 */
function compareScoredCandidates(
    left: ScoredCandidate,
    right: ScoredCandidate,
): number {
    return right.rerankScore - left.rerankScore
        || right.candidate.rrfScore - left.candidate.rrfScore
        || left.candidate.chunkId - right.candidate.chunkId
}

/**
 * 移除内部检索文本并生成公开的重排结果。
 */
function toRerankedResult(
    item: ScoredCandidate,
): RetrievalResult {
    return {
        chunkId: item.candidate.chunkId,
        documentId: item.candidate.documentId,
        chunkIndex: item.candidate.chunkIndex,
        content: item.candidate.content,
        metadata: item.candidate.metadata,
        rrfScore: item.candidate.rrfScore,
        matches: item.candidate.matches,
        rerankScore: item.rerankScore,
        rerankQuery: item.rerankQuery,
    }
}
