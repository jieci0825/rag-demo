import { describe, expect, it } from 'vitest'

import {
    fuseRankedResults,
    selectFusedResults,
} from '../src/modules/retrieval/result-fusion.js'

import type { RetrievalCandidate } from '../src/modules/retrieval/retrieval.repository.js'
import type { RankedRetrievalList } from '../src/modules/retrieval/result-fusion.js'

describe('RRF 结果融合', () => {
    it('合并重复 chunk 并让多路靠前命中的结果优先', () => {
        const rankedLists: RankedRetrievalList[] = [
            {
                query: '退款流程',
                channel: 'vector',
                results: [
                    createCandidate(1, 0.92),
                    createCandidate(2, 0.88),
                ],
            },
            {
                query: '退款流程',
                channel: 'keyword',
                results: [
                    createCandidate(2, 0.95),
                    createCandidate(3, 0.8),
                ],
            },
        ]

        const results = fuseRankedResults(rankedLists)

        expect(results.map(result => result.chunkId)).toEqual([2, 1, 3])
        expect(results[0]?.matches).toEqual([
            {
                query: '退款流程',
                channel: 'vector',
                rank: 2,
                score: 0.88,
            },
            {
                query: '退款流程',
                channel: 'keyword',
                rank: 1,
                score: 0.95,
            },
        ])
    })

    it('普通策略按全局 RRF 排名截取 Top K', () => {
        const rankedLists: RankedRetrievalList[] = [
            {
                query: '查询一',
                channel: 'vector',
                results: [
                    createCandidate(1, 0.9),
                    createCandidate(2, 0.8),
                ],
            },
            {
                query: '查询二',
                channel: 'keyword',
                results: [
                    createCandidate(2, 0.9),
                    createCandidate(3, 0.8),
                ],
            },
        ]

        const results = selectFusedResults('multi_query', rankedLists, 2)

        expect(results.map(result => result.chunkId)).toEqual([2, 1])
    })

    it('拆解策略优先保留每个子查询的独立结果', () => {
        const rankedLists: RankedRetrievalList[] = [
            {
                query: '退款条件',
                channel: 'vector',
                results: [
                    createCandidate(1, 0.95),
                    createCandidate(2, 0.9),
                ],
            },
            {
                query: '退款条件',
                channel: 'keyword',
                results: [
                    createCandidate(1, 0.98),
                ],
            },
            {
                query: '到账时间',
                channel: 'vector',
                results: [
                    createCandidate(3, 0.92),
                ],
            },
            {
                query: '到账时间',
                channel: 'keyword',
                results: [
                    createCandidate(3, 0.96),
                ],
            },
        ]

        const results = selectFusedResults('decomposition', rankedLists, 2)

        expect(results.map(result => result.chunkId)).toEqual([1, 3])
    })
})

/**
 * 创建用于融合测试的最小召回候选项。
 */
function createCandidate(
    chunkId: number,
    score: number,
): RetrievalCandidate {
    return {
        chunkId,
        documentId: 1,
        chunkIndex: chunkId - 1,
        content: `chunk-${chunkId}`,
        metadata: null,
        score,
    }
}
