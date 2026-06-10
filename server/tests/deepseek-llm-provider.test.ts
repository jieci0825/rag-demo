import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDeepSeekLlmProvider } from '../src/rag-core/llm/deepseek-llm.provider.js'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
}))

vi.mock('../src/config/env.js', () => ({
    env: {
        DEEPSEEK_API_KEY: 'test-api-key',
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
    },
}))

describe('DeepSeek LLM Provider', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', mocks.fetch)
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.unstubAllGlobals()
    })

    it('使用 Chat Completions JSON 模式请求结构化输出', async () => {
        mocks.fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: '{"rewrittenQuery":"标准查询"}',
                    },
                }],
            }),
        })
        const provider = createDeepSeekLlmProvider()
        const format = {
            type: 'object',
            properties: {
                rewrittenQuery: {
                    type: 'string',
                },
            },
        }
        const messages = [
            {
                role: 'system' as const,
                content: 'Rewrite the query.',
            },
            {
                role: 'user' as const,
                content: '原查询',
            },
        ]

        await expect(provider.generateStructuredOutput(
            'deepseek-v4-pro',
            {
                messages,
                format,
            },
        )).resolves.toEqual({
            rewrittenQuery: '标准查询',
        })

        expect(mocks.fetch).toHaveBeenCalledWith(
            'https://api.deepseek.com/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    Authorization: 'Bearer test-api-key',
                    'Content-Type': 'application/json',
                },
            }),
        )

        const request = getRequestBody()

        expect(request).toEqual({
            model: 'deepseek-v4-pro',
            messages: [
                {
                    role: 'system',
                    content: expect.stringContaining(JSON.stringify(format)),
                },
                {
                    role: 'user',
                    content: '原查询',
                },
            ],
            response_format: {
                type: 'json_object',
            },
            thinking: {
                type: 'disabled',
            },
            stream: false,
        })
    })

    it('返回非流式聊天内容', async () => {
        mocks.fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: '完整回复',
                    },
                }],
            }),
        })
        const provider = createDeepSeekLlmProvider()

        await expect(provider.chat('deepseek-v4-pro', {
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream: false,
        })).resolves.toEqual({
            content: '完整回复',
        })

        expect(getRequestBody()).toEqual({
            model: 'deepseek-v4-pro',
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream: false,
        })
    })

    it('将 DeepSeek SSE 响应解析为聊天数据块', async () => {
        const encoder = new TextEncoder()
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(encoder.encode(
                    'data: {"choices":[{"delta":{"content":"你"}}]}\n',
                ))
                controller.enqueue(encoder.encode(
                    '\ndata: {"choices":[{"delta":{"content":"好"}}]}\n\n'
                    + 'data: [DONE]\n\n',
                ))
                controller.close()
            },
        })

        mocks.fetch.mockResolvedValue({
            ok: true,
            body,
        })
        const provider = createDeepSeekLlmProvider()
        const chunks = provider.chat('deepseek-v4-flash', {
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream: true,
        })

        await expect(collectChunks(chunks)).resolves.toEqual([
            { content: '你' },
            { content: '好' },
        ])
        expect(getRequestBody()).toEqual({
            model: 'deepseek-v4-flash',
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream: true,
        })
    })

    it('上游返回非成功状态时抛出错误', async () => {
        mocks.fetch.mockResolvedValue({
            ok: false,
            status: 503,
        })
        const provider = createDeepSeekLlmProvider()

        await expect(provider.generateStructuredOutput(
            'deepseek-v4-flash',
            {
                messages: [],
                format: {},
            },
        )).rejects.toThrow('DeepSeek chat request failed with status 503')
    })

    it('模型内容不是合法 JSON 时抛出错误', async () => {
        mocks.fetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                choices: [{
                    message: {
                        content: 'not-json',
                    },
                }],
            }),
        })
        const provider = createDeepSeekLlmProvider()

        await expect(provider.generateStructuredOutput(
            'deepseek-v4-flash',
            {
                messages: [],
                format: {},
            },
        )).rejects.toThrow()
    })
})

/**
 * 返回最近一次 DeepSeek 请求的 JSON body。
 */
function getRequestBody(): Record<string, unknown> {
    return JSON.parse(
        mocks.fetch.mock.calls[0][1].body as string,
    ) as Record<string, unknown>
}

/**
 * 收集异步聊天数据块，便于断言流式结果。
 */
async function collectChunks<T>(chunks: AsyncIterable<T>): Promise<T[]> {
    const result: T[] = []

    for await (const chunk of chunks) {
        result.push(chunk)
    }

    return result
}
