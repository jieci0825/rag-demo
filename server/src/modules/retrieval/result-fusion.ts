import type { QueryTransformOutput } from './retrieval.schema.js'
import type { RetrievalCandidate } from './retrieval.repository.js'

const RRF_RANK_CONSTANT = 60

export type RetrievalChannel = 'vector' | 'keyword'

export interface RankedRetrievalList {
    query: string
    channel: RetrievalChannel
    results: RetrievalCandidate[]
}

export interface RetrievalMatch {
    query: string
    channel: RetrievalChannel
    rank: number
    score: number
}

export interface FusedRetrievalResult {
    chunkId: number
    documentId: number
    chunkIndex: number
    content: string
    searchText: string
    metadata: Record<string, unknown> | null
    rrfScore: number
    matches: RetrievalMatch[]
}

/**
 * 使用 RRF 按 chunk ID 合并多路排名，并保留每次命中的来源信息。
 */
export function fuseRankedResults(
    rankedLists: RankedRetrievalList[]
): FusedRetrievalResult[] {
    const fusedResults = new Map<number, FusedRetrievalResult>()

    for (const rankedList of rankedLists) {
        rankedList.results.forEach((candidate, index) => {
            const rank = index + 1
            const existingResult = fusedResults.get(candidate.chunkId)
            const rrfScore = 1 / (RRF_RANK_CONSTANT + rank)
            const match: RetrievalMatch = {
                query: rankedList.query,
                channel: rankedList.channel,
                rank,
                score: candidate.score,
            }

            if (existingResult) {
                existingResult.rrfScore += rrfScore
                existingResult.matches.push(match)
                return
            }

            fusedResults.set(candidate.chunkId, {
                chunkId: candidate.chunkId,
                documentId: candidate.documentId,
                chunkIndex: candidate.chunkIndex,
                content: candidate.content,
                searchText: candidate.searchText,
                metadata: candidate.metadata,
                rrfScore,
                matches: [match],
            })
        })
    }

    return [...fusedResults.values()].sort(compareFusedResults)
}

/**
 * 按查询转换策略选择指定数量的 RRF 候选。
 *
 * none、rewrite、expand 和 multi_query 的多条查询仍表达同一检索意图，
 * 可以直接按全局 RRF 分数截取。decomposition 的查询分别代表不同子问题，
 * 如果直接全局截取，高分子问题可能占满候选，因此先为每个子问题保留一个
 * 未重复 chunk，再按全局 RRF 排名补齐剩余名额。该函数既用于生成重排候选，
 * 也用于 Reranker 不可用时选择降级结果。
 */
export function selectFusedResults(
    strategy: QueryTransformOutput['strategy'],
    rankedLists: RankedRetrievalList[],
    topK: number
): FusedRetrievalResult[] {
    const fusedResults = fuseRankedResults(rankedLists)

    // 其他策略表达同一意图，不需要额外保证不同查询之间的候选覆盖。
    if (strategy !== 'decomposition') {
        return fusedResults.slice(0, topK)
    }

    const selectedChunkIds = selectDecompositionChunkIds(rankedLists, topK)

    for (const result of fusedResults) {
        if (selectedChunkIds.size >= topK) {
            break
        }

        selectedChunkIds.add(result.chunkId)
    }

    return fusedResults
        .filter(result => selectedChunkIds.has(result.chunkId))
        .slice(0, topK)
}

/**
 * 从每个拆解子查询的局部融合结果中优先选择一个未重复 chunk。
 */
function selectDecompositionChunkIds(
    rankedLists: RankedRetrievalList[],
    topK: number
): Set<number> {
    const selectedChunkIds = new Set<number>()
    const queries = [
        ...new Set(rankedLists.map(rankedList => rankedList.query)),
    ]

    for (const query of queries) {
        if (selectedChunkIds.size >= topK) {
            break
        }

        const queryResults = fuseRankedResults(
            rankedLists.filter(rankedList => rankedList.query === query)
        )
        const candidate = queryResults.find(
            result => !selectedChunkIds.has(result.chunkId)
        )

        if (candidate) {
            selectedChunkIds.add(candidate.chunkId)
        }
    }

    return selectedChunkIds
}

/**
 * 按 RRF 分数降序排列，并使用 chunk ID 保证同分结果稳定。
 */
function compareFusedResults(
    left: FusedRetrievalResult,
    right: FusedRetrievalResult
): number {
    return right.rrfScore - left.rrfScore || left.chunkId - right.chunkId
}
