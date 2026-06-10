import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDeepSeekLlmProvider } from '../src/rag-core/llm/deepseek-llm.provider.js'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
}))

vi.mock('../src/config/env.js', () => ({
    env: {
        DEEPSEEK_API_KEY: 'test-api-key',
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
        DEEPSEEK_MODEL: 'deepseek-v4-flash',
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

        await expect(provider.generateStructuredOutput({
            messages,
            format,
        })).resolves.toEqual({
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

        const request = JSON.parse(
            mocks.fetch.mock.calls[0][1].body as string,
        ) as {
            messages: Array<{ role: string, content: string }>
            [key: string]: unknown
        }

        expect(request).toEqual({
            model: 'deepseek-v4-flash',
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

    it('上游返回非成功状态时抛出错误', async () => {
        mocks.fetch.mockResolvedValue({
            ok: false,
            status: 503,
        })
        const provider = createDeepSeekLlmProvider()

        await expect(provider.generateStructuredOutput({
            messages: [],
            format: {},
        })).rejects.toThrow('DeepSeek chat request failed with status 503')
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

        await expect(provider.generateStructuredOutput({
            messages: [],
            format: {},
        })).rejects.toThrow()
    })
})
