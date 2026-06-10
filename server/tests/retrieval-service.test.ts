import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BadGatewayError } from '../src/lib/errors.js'
import { transformQuery } from '../src/modules/retrieval/retrieval.service.js'

import type { LlmProvider } from '../src/rag-core/llm/index.js'

const mocks = vi.hoisted(() => ({
    createLlmProvider: vi.fn(),
    createQueryLog: vi.fn(),
    log: vi.fn(),
}))

vi.mock('../src/rag-core/llm/index.js', () => ({
    createLlmProvider: mocks.createLlmProvider,
}))

vi.mock('../src/modules/query-logs/query-logs.repository.js', () => ({
    createQueryLog: mocks.createQueryLog,
}))

vi.mock('../src/lib/logger.js', () => ({
    log: mocks.log,
}))

describe('查询改写服务', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.createQueryLog.mockResolvedValue(undefined)
    })

    it('根据提供商创建 Provider 并传递模型名称', async () => {
        const llmProvider = createTestLlmProvider({
            rewrittenQuery: '标准查询',
        })

        mocks.createLlmProvider.mockReturnValue(llmProvider)

        await transformQuery({
            query: '原查询',
            provider: 'deepseek',
            model: 'deepseek-v4-pro',
        })

        expect(mocks.createLlmProvider).toHaveBeenCalledWith('deepseek')
        expect(llmProvider.generateStructuredOutput).toHaveBeenCalledWith(
            'deepseek-v4-pro',
            expect.any(Object),
        )
    })

    it('只将 trim 后的查询交给 LLM，并保留原文写入日志和响应', async () => {
        const generateStructuredOutput = vi.fn().mockResolvedValue({
            rewrittenQuery: 'Markdown 文档上传后如何进行解析和 Chunk 切分？',
        })
        const llmProvider = {
            chat: vi.fn(),
            generateStructuredOutput,
        } as unknown as LlmProvider
        const originalQuery = '  markdown 上传以后是咋拆的  '

        await expect(transformQuery({
            query: originalQuery,
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).resolves.toEqual({
            originalQuery,
            rewrittenQuery: 'Markdown 文档上传后如何进行解析和 Chunk 切分？',
        })

        expect(generateStructuredOutput).toHaveBeenCalledWith(
            'deepseek-v4-flash',
            {
                messages: [
                    {
                        role: 'system',
                        content: expect.stringContaining('只重写查询。不要回答查询。'),
                    },
                    {
                        role: 'user',
                        content: 'markdown 上传以后是咋拆的',
                    },
                ],
                format: {
                    type: 'object',
                    properties: {
                        rewrittenQuery: {
                            type: 'string',
                            minLength: 1,
                        },
                    },
                    required: ['rewrittenQuery'],
                    additionalProperties: false,
                },
            },
        )
        expect(mocks.createQueryLog).toHaveBeenCalledWith({
            queryText: originalQuery,
            queryTransforms: {
                rewrite: {
                    query: 'Markdown 文档上传后如何进行解析和 Chunk 切分？',
                },
            },
            queryEmbedding: null,
            topK: null,
            retrievedChunks: null,
            latencyMs: expect.any(Number),
        })
    })

    it('允许改写结果与原查询相同', async () => {
        const llmProvider = createTestLlmProvider({
            rewrittenQuery: '已经标准化的查询',
        })

        await expect(transformQuery({
            query: '已经标准化的查询',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).resolves.toEqual({
            originalQuery: '已经标准化的查询',
            rewrittenQuery: '已经标准化的查询',
        })
    })

    it('LLM 调用失败时返回 502 且不写日志', async () => {
        const llmProvider = createTestLlmProvider()

        vi.mocked(llmProvider.generateStructuredOutput).mockRejectedValue(
            new Error('upstream failed'),
        )

        await expect(transformQuery({
            query: '原查询',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).rejects.toEqual(
            new BadGatewayError('Query rewrite service failed'),
        )

        expect(mocks.createQueryLog).not.toHaveBeenCalled()
    })

    it('LLM 返回非法结构时返回 502 且不写日志', async () => {
        const llmProvider = createTestLlmProvider({
            rewrittenQuery: '   ',
        })

        await expect(transformQuery({
            query: '原查询',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).rejects.toEqual(
            new BadGatewayError('Query rewrite service failed'),
        )

        expect(mocks.createQueryLog).not.toHaveBeenCalled()
    })

    it('日志写入失败时保留数据库错误', async () => {
        const databaseError = new Error('database failed')
        const llmProvider = createTestLlmProvider({
            rewrittenQuery: '标准查询',
        })

        mocks.createQueryLog.mockRejectedValue(databaseError)

        await expect(transformQuery({
            query: '原查询',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).rejects.toBe(databaseError)
    })
})

/**
 * 创建返回固定结构化结果的测试 LLM Provider。
 */
function createTestLlmProvider(output?: unknown): LlmProvider {
    return {
        chat: vi.fn(),
        generateStructuredOutput: vi.fn().mockResolvedValue(output),
    } as unknown as LlmProvider
}
