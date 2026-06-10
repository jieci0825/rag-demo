import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BadGatewayError } from '../src/lib/errors.js'
import { transformQuery } from '../src/modules/retrieval/retrieval.service.js'

import type { LlmProvider } from '../src/rag-core/llm/index.js'

const mocks = vi.hoisted(() => ({
    createQueryLog: vi.fn(),
    log: vi.fn(),
}))

vi.mock('../src/config/env.js', () => ({
    env: {
        DEEPSEEK_API_KEY: 'test-api-key',
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
        DEEPSEEK_MODEL: 'deepseek-v4-flash',
    },
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

    it('只将 trim 后的查询交给 LLM，并保留原文写入日志和响应', async () => {
        const generateStructuredOutput = vi.fn().mockResolvedValue({
            rewrittenQuery: 'Markdown 文档上传后如何进行解析和 Chunk 切分？',
        })
        const llmProvider = {
            generateStructuredOutput,
        } satisfies LlmProvider
        const originalQuery = '  markdown 上传以后是咋拆的  '

        await expect(transformQuery(
            originalQuery,
            llmProvider,
        )).resolves.toEqual({
            originalQuery,
            rewrittenQuery: 'Markdown 文档上传后如何进行解析和 Chunk 切分？',
        })

        expect(generateStructuredOutput).toHaveBeenCalledWith({
            messages: [
                {
                    role: 'system',
                    content: expect.stringContaining('Only rewrite the query. Do not answer it.'),
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
        })
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
        const llmProvider = createLlmProvider({
            rewrittenQuery: '已经标准化的查询',
        })

        await expect(transformQuery(
            '已经标准化的查询',
            llmProvider,
        )).resolves.toEqual({
            originalQuery: '已经标准化的查询',
            rewrittenQuery: '已经标准化的查询',
        })
    })

    it('LLM 调用失败时返回 502 且不写日志', async () => {
        const llmProvider = {
            generateStructuredOutput: vi.fn().mockRejectedValue(
                new Error('upstream failed'),
            ),
        } satisfies LlmProvider

        await expect(transformQuery(
            '原查询',
            llmProvider,
        )).rejects.toEqual(new BadGatewayError('Query rewrite service failed'))

        expect(mocks.createQueryLog).not.toHaveBeenCalled()
    })

    it('LLM 返回非法结构时返回 502 且不写日志', async () => {
        const llmProvider = createLlmProvider({
            rewrittenQuery: '   ',
        })

        await expect(transformQuery(
            '原查询',
            llmProvider,
        )).rejects.toEqual(new BadGatewayError('Query rewrite service failed'))

        expect(mocks.createQueryLog).not.toHaveBeenCalled()
    })

    it('日志写入失败时保留数据库错误', async () => {
        const databaseError = new Error('database failed')
        const llmProvider = createLlmProvider({
            rewrittenQuery: '标准查询',
        })

        mocks.createQueryLog.mockRejectedValue(databaseError)

        await expect(transformQuery(
            '原查询',
            llmProvider,
        )).rejects.toBe(databaseError)
    })
})

/**
 * 创建返回固定结构化结果的测试 LLM Provider。
 */
function createLlmProvider(output: unknown): LlmProvider {
    return {
        generateStructuredOutput: vi.fn().mockResolvedValue(output),
    }
}
