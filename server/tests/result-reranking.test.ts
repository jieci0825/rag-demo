import { describe, expect, it } from 'vitest'

import {
    selectRerankedResults,
    toRrfResults,
} from '../src/modules/retrieval/result-reranking.js'

import type { FusedRetrievalResult } from '../src/modules/retrieval/result-fusion.js'

describe('Cross-Encoder 结果重排', () => {
    it('按最高查询分数排序，并使用 RRF 分数处理同分', () => {
        const candidates = [
            createCandidate(1, 0.03),
            createCandidate(2, 0.02),
            createCandidate(3, 0.01),
        ]

        const results = selectRerankedResults(
            'multi_query',
            ['查询一', '查询二'],
            candidates,
            {
                model: 'test-reranker',
                results: [
                    { chunkId: 1, scores: [0.7, 0.6] },
                    { chunkId: 2, scores: [0.9, 0.2] },
                    { chunkId: 3, scores: [0.9, 0.1] },
                ],
            },
            2,
        )

        expect(results.map(result => result.chunkId)).toEqual([2, 3])
        expect(results[0]).toEqual(expect.objectContaining({
            rerankScore: 0.9,
            rerankQuery: '查询一',
        }))
    })

    it('拆解策略优先覆盖每个子查询', () => {
        const candidates = [
            createCandidate(1, 0.03),
            createCandidate(2, 0.02),
            createCandidate(3, 0.01),
        ]

        const results = selectRerankedResults(
            'decomposition',
            ['退款条件', '到账时间'],
            candidates,
            {
                model: 'test-reranker',
                results: [
                    { chunkId: 1, scores: [0.99, 0.8] },
                    { chunkId: 2, scores: [0.98, 0.7] },
                    { chunkId: 3, scores: [0.5, 0.75] },
                ],
            },
            2,
        )

        expect(results.map(result => result.chunkId)).toEqual([1, 3])
    })

    it('降级结果不暴露内部检索文本并将重排字段置空', () => {
        const [result] = toRrfResults([createCandidate(1, 0.03)])

        expect(result).toEqual({
            chunkId: 1,
            documentId: 1,
            chunkIndex: 0,
            content: 'chunk-1',
            metadata: null,
            rrfScore: 0.03,
            matches: [],
            rerankScore: null,
            rerankQuery: null,
        })
        expect(result).not.toHaveProperty('searchText')
    })
})

/**
 * 创建用于重排测试的 RRF 候选。
 */
function createCandidate(
    chunkId: number,
    rrfScore: number,
): FusedRetrievalResult {
    return {
        chunkId,
        documentId: 1,
        chunkIndex: chunkId - 1,
        content: `chunk-${chunkId}`,
        searchText: `标题\n\nchunk-${chunkId}`,
        metadata: null,
        rrfScore,
        matches: [],
    }
}
