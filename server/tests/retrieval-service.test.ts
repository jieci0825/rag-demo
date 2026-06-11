import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ERROR_DEFINITIONS } from '../src/constants/error-definitions.js'
import { AppError } from '../src/lib/errors.js'
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

vi.mock('../src/rag-core/embeddings/qwen-embedding.provider.js', () => ({
    createQwenEmbeddingProvider: vi.fn(),
}))

vi.mock('../src/rag-core/rerankers/index.js', () => ({
    createHttpRerankerProvider: vi.fn(),
}))

vi.mock('../src/modules/retrieval/retrieval.repository.js', () => ({
    searchChunksByKeyword: vi.fn(),
    searchChunksByVector: vi.fn(),
}))

vi.mock('../src/modules/query-logs/query-logs.repository.js', () => ({
    createQueryLog: mocks.createQueryLog,
}))

vi.mock('../src/lib/logger.js', () => ({
    log: mocks.log,
}))

describe('查询转换服务', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.createQueryLog.mockResolvedValue(undefined)
    })

    it('根据提供商创建 Provider 并传递模型名称', async () => {
        const llmProvider = createTestLlmProvider({
            strategy: 'rewrite',
            queries: ['标准查询'],
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
            strategy: 'rewrite',
            queries: ['Markdown 文档上传后如何进行解析和 Chunk 切分？'],
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
            strategy: 'rewrite',
            queries: ['Markdown 文档上传后如何进行解析和 Chunk 切分？'],
        })

        expect(generateStructuredOutput).toHaveBeenCalledWith(
            'deepseek-v4-flash',
            {
                messages: [
                    {
                        role: 'system',
                        content: expect.stringContaining('选择且只选择一种查询转换策略'),
                    },
                    {
                        role: 'user',
                        content: 'markdown 上传以后是咋拆的',
                    },
                ],
                format: expect.objectContaining({
                    oneOf: expect.any(Array),
                }),
            },
        )
        expect(mocks.createQueryLog).toHaveBeenCalledWith({
            queryText: originalQuery,
            queryTransforms: {
                strategy: 'rewrite',
                queries: ['Markdown 文档上传后如何进行解析和 Chunk 切分？'],
            },
            queryEmbedding: null,
            topK: null,
            retrievedChunks: null,
            latencyMs: expect.any(Number),
        })
    })

    it('允许通过 none 策略保留原查询', async () => {
        const llmProvider = createTestLlmProvider({
            strategy: 'none',
            queries: ['已经标准化的查询'],
        })

        await expect(transformQuery({
            query: '已经标准化的查询',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).resolves.toEqual({
            originalQuery: '已经标准化的查询',
            strategy: 'none',
            queries: ['已经标准化的查询'],
        })
    })

    it('LLM 调用失败时不重试并记录详细日志', async () => {
        const llmProvider = createTestLlmProvider()
        const upstreamError = new Error('upstream failed')

        vi.mocked(llmProvider.generateStructuredOutput).mockRejectedValue(
            upstreamError,
        )

        await expect(transformQuery({
            query: '原查询',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).rejects.toEqual(
            new AppError(ERROR_DEFINITIONS.QUERY_TRANSFORM_FAILED),
        )

        expect(llmProvider.generateStructuredOutput).toHaveBeenCalledTimes(1)
        expect(mocks.log).toHaveBeenCalledWith(
            'error',
            'Query transform LLM request failed',
            expect.objectContaining({
                attempt: 1,
                maxAttempts: 3,
                messages: expect.any(Array),
                err: upstreamError,
            }),
        )
        expect(mocks.createQueryLog).not.toHaveBeenCalled()
    })

    it('Zod 校验失败后携带完整对话定向修复', async () => {
        const invalidOutput = {
            strategy: 'multi_query',
            queries: ['只有一条查询'],
        }
        const repairedOutput = {
            strategy: 'multi_query',
            queries: ['查询表达一', '查询表达二'],
        }
        const llmProvider = createTestLlmProvider()
        const generateStructuredOutput = vi.mocked(
            llmProvider.generateStructuredOutput,
        )

        generateStructuredOutput
            .mockResolvedValueOnce(invalidOutput)
            .mockResolvedValueOnce(repairedOutput)

        await expect(transformQuery({
            query: '原查询',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).resolves.toEqual({
            originalQuery: '原查询',
            ...repairedOutput,
        })

        expect(generateStructuredOutput).toHaveBeenCalledTimes(2)
        expect(generateStructuredOutput.mock.calls[1]?.[1].messages).toEqual([
            {
                role: 'system',
                content: expect.stringContaining('选择且只选择一种查询转换策略'),
            },
            {
                role: 'user',
                content: '原查询',
            },
            {
                role: 'assistant',
                content: JSON.stringify(invalidOutput),
            },
            {
                role: 'user',
                content: expect.stringMatching(/Zod 校验问题[\s\S]*queries/),
            },
        ])
        expect(mocks.log).toHaveBeenCalledWith(
            'warn',
            'Query transform output validation failed',
            expect.objectContaining({
                attempt: 1,
                retriesRemaining: 2,
                output: invalidOutput,
                zodIssues: expect.any(Array),
            }),
        )
    })

    it('连续三次未通过 Zod 校验时记录每次结果并返回统一错误', async () => {
        const invalidOutput = {
            strategy: 'multi_query',
            queries: ['只有一条查询'],
        }
        const llmProvider = createTestLlmProvider(invalidOutput)
        const generateStructuredOutput = vi.mocked(
            llmProvider.generateStructuredOutput,
        )

        await expect(transformQuery({
            query: '原查询',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        }, llmProvider)).rejects.toEqual(
            new AppError(ERROR_DEFINITIONS.QUERY_TRANSFORM_FAILED),
        )

        expect(generateStructuredOutput).toHaveBeenCalledTimes(3)
        expect(generateStructuredOutput.mock.calls[2]?.[1].messages).toHaveLength(6)
        expect(mocks.log).toHaveBeenNthCalledWith(
            3,
            'error',
            'Query transform output validation failed',
            expect.objectContaining({
                attempt: 3,
                maxAttempts: 3,
                retriesRemaining: 0,
                output: invalidOutput,
                zodIssues: expect.any(Array),
            }),
        )
        expect(mocks.createQueryLog).not.toHaveBeenCalled()
    })

    it('日志写入失败时保留数据库错误', async () => {
        const databaseError = new Error('database failed')
        const llmProvider = createTestLlmProvider({
            strategy: 'rewrite',
            queries: ['标准查询'],
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
