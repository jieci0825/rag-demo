import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createHttpRerankerProvider } from '../src/rag-core/rerankers/index.js'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
}))

vi.mock('../src/config/env.js', () => ({
    env: {
        RERANKER_BASE_URL: 'http://localhost:8001',
        RERANKER_TIMEOUT_MS: 5,
    },
}))

describe('HTTP Reranker Provider', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', mocks.fetch)
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.unstubAllGlobals()
    })

    it('发送批量重排请求并返回评分矩阵', async () => {
        mocks.fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                model: 'test-reranker',
                results: [
                    {
                        chunkId: 1,
                        scores: [0.9, 0.8],
                    },
                    {
                        chunkId: 2,
                        scores: [0.7, 0.6],
                    },
                ],
            }),
        })
        const provider = createHttpRerankerProvider()
        const request = {
            queries: ['查询一', '查询二'],
            documents: [
                { chunkId: 1, text: '文档一' },
                { chunkId: 2, text: '文档二' },
            ],
        }

        await expect(provider.rerank(request)).resolves.toEqual({
            model: 'test-reranker',
            results: [
                {
                    chunkId: 1,
                    scores: [0.9, 0.8],
                },
                {
                    chunkId: 2,
                    scores: [0.7, 0.6],
                },
            ],
        })
        expect(mocks.fetch).toHaveBeenCalledWith(
            'http://localhost:8001/rerank',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(request),
                signal: expect.any(AbortSignal),
            }),
        )
    })

    it('拒绝缺少候选结果的响应', async () => {
        mocks.fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                model: 'test-reranker',
                results: [{
                    chunkId: 1,
                    scores: [0.9],
                }],
            }),
        })
        const provider = createHttpRerankerProvider()

        await expect(provider.rerank({
            queries: ['查询'],
            documents: [
                { chunkId: 1, text: '文档一' },
                { chunkId: 2, text: '文档二' },
            ],
        })).rejects.toThrow(
            'Reranker response document count does not match request',
        )
    })

    it('拒绝评分数量与查询数量不一致的响应', async () => {
        mocks.fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                model: 'test-reranker',
                results: [{
                    chunkId: 1,
                    scores: [0.9],
                }],
            }),
        })
        const provider = createHttpRerankerProvider()

        await expect(provider.rerank({
            queries: ['查询一', '查询二'],
            documents: [{ chunkId: 1, text: '文档' }],
        })).rejects.toThrow(
            'Reranker response score count does not match queries',
        )
    })

    it('拒绝响应中的未知 chunk ID', async () => {
        mocks.fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                model: 'test-reranker',
                results: [{
                    chunkId: 999,
                    scores: [0.9],
                }],
            }),
        })
        const provider = createHttpRerankerProvider()

        await expect(provider.rerank({
            queries: ['查询'],
            documents: [{ chunkId: 1, text: '文档' }],
        })).rejects.toThrow(
            'Reranker response contains invalid chunk IDs',
        )
    })

    it('请求超过超时时间时抛出异常', async () => {
        mocks.fetch.mockImplementation(
            (_url: string, init: RequestInit) => new Promise(
                (_resolve, reject) => {
                    init.signal?.addEventListener('abort', () => {
                        reject(init.signal?.reason)
                    })
                },
            ),
        )
        const provider = createHttpRerankerProvider()

        await expect(provider.rerank({
            queries: ['查询'],
            documents: [{ chunkId: 1, text: '文档' }],
        })).rejects.toBeDefined()
    })
})
