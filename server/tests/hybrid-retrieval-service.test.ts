import { beforeEach, describe, expect, it, vi } from 'vitest'

import { searchKnowledgeBase } from '../src/modules/retrieval/retrieval.service.js'

import type { EmbeddingProvider } from '../src/rag-core/embeddings/embedding.provider.js'
import type { LlmProvider } from '../src/rag-core/llm/index.js'
import type { RetrievalCandidate } from '../src/modules/retrieval/retrieval.repository.js'

const mocks = vi.hoisted(() => ({
    createQueryLog: vi.fn(),
    log: vi.fn(),
    searchChunksByKeyword: vi.fn(),
    searchChunksByVector: vi.fn(),
}))

vi.mock('../src/rag-core/embeddings/qwen-embedding.provider.js', () => ({
    createQwenEmbeddingProvider: vi.fn(),
}))

vi.mock('../src/rag-core/llm/index.js', () => ({
    createLlmProvider: vi.fn(),
}))

vi.mock('../src/modules/query-logs/query-logs.repository.js', () => ({
    createQueryLog: mocks.createQueryLog,
}))

vi.mock('../src/modules/retrieval/retrieval.repository.js', () => ({
    searchChunksByKeyword: mocks.searchChunksByKeyword,
    searchChunksByVector: mocks.searchChunksByVector,
}))

vi.mock('../src/lib/logger.js', () => ({
    log: mocks.log,
}))

describe('混合检索服务', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.createQueryLog.mockResolvedValue(undefined)
    })

    it('批量生成查询向量并对每条查询执行两路召回', async () => {
        const llmProvider = createTestLlmProvider({
            strategy: 'multi_query',
            queries: ['Markdown 解析', 'Markdown 分块'],
        })
        const embeddingProvider = createTestEmbeddingProvider([
            [0.1, 0.2],
            [0.3, 0.4],
        ])

        mocks.searchChunksByVector
            .mockResolvedValueOnce([createCandidate(1, 0.9)])
            .mockResolvedValueOnce([createCandidate(2, 0.88)])
        mocks.searchChunksByKeyword
            .mockResolvedValueOnce([createCandidate(1, 0.95)])
            .mockResolvedValueOnce([createCandidate(3, 0.86)])

        const result = await searchKnowledgeBase({
            query: 'markdown 怎么处理',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            topK: 2,
        }, llmProvider, embeddingProvider)

        expect(embeddingProvider.embedTexts).toHaveBeenCalledWith([
            'Markdown 解析',
            'Markdown 分块',
        ])
        expect(mocks.searchChunksByVector).toHaveBeenNthCalledWith(
            1,
            [0.1, 0.2],
            20,
        )
        expect(mocks.searchChunksByVector).toHaveBeenNthCalledWith(
            2,
            [0.3, 0.4],
            20,
        )
        expect(mocks.searchChunksByKeyword).toHaveBeenCalledTimes(2)
        expect(result.results.map(item => item.chunkId)).toEqual([1, 2])
        expect(mocks.createQueryLog).toHaveBeenCalledTimes(1)
        expect(mocks.createQueryLog).toHaveBeenCalledWith({
            queryText: 'markdown 怎么处理',
            queryTransforms: {
                strategy: 'multi_query',
                queries: ['Markdown 解析', 'Markdown 分块'],
            },
            queryEmbedding: [0.1, 0.2],
            topK: 2,
            retrievedChunks: result.results,
            latencyMs: expect.any(Number),
        })
    })

    it('移除重复转换查询，避免同一排名被重复计分', async () => {
        const llmProvider = createTestLlmProvider({
            strategy: 'expand',
            queries: ['退款流程', '退款流程'],
        })
        const embeddingProvider = createTestEmbeddingProvider([[0.1, 0.2]])

        mocks.searchChunksByVector.mockResolvedValue([
            createCandidate(1, 0.9),
        ])
        mocks.searchChunksByKeyword.mockResolvedValue([
            createCandidate(1, 0.95),
        ])

        await searchKnowledgeBase({
            query: '退款',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            topK: 5,
        }, llmProvider, embeddingProvider)

        expect(embeddingProvider.embedTexts).toHaveBeenCalledWith(['退款流程'])
        expect(mocks.searchChunksByVector).toHaveBeenCalledTimes(1)
        expect(mocks.searchChunksByKeyword).toHaveBeenCalledTimes(1)
    })
})

/**
 * 创建返回指定查询转换结果的测试 LLM Provider。
 */
function createTestLlmProvider(output: unknown): LlmProvider {
    return {
        chat: vi.fn(),
        generateStructuredOutput: vi.fn().mockResolvedValue(output),
    } as unknown as LlmProvider
}

/**
 * 创建返回指定向量列表的测试 Embedding Provider。
 */
function createTestEmbeddingProvider(
    embeddings: number[][],
): EmbeddingProvider {
    return {
        embedText: vi.fn(),
        embedTexts: vi.fn().mockResolvedValue(embeddings),
    }
}

/**
 * 创建用于服务测试的最小召回候选项。
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
