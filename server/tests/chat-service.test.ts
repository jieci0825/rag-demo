import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BadGatewayError } from '../src/lib/errors.js'
import { chat } from '../src/modules/chat/chat-service.js'

import type { LlmProvider } from '../src/rag-core/llm/index.js'

const mocks = vi.hoisted(() => ({
    createLlmProvider: vi.fn(),
}))

vi.mock('../src/rag-core/llm/index.js', () => ({
    createLlmProvider: mocks.createLlmProvider,
}))

describe('聊天服务', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('根据提供商和模型执行非流式聊天', async () => {
        const provider = createTestProvider()

        mocks.createLlmProvider.mockReturnValue(provider)
        vi.mocked(provider.chat).mockResolvedValue({
            content: '完整回复',
        })

        await expect(chat({
            provider: 'deepseek',
            model: 'deepseek-v4-pro',
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream: false,
        })).resolves.toEqual({
            content: '完整回复',
        })

        expect(mocks.createLlmProvider).toHaveBeenCalledWith('deepseek')
        expect(provider.chat).toHaveBeenCalledWith('deepseek-v4-pro', {
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream: false,
        })
    })

    it('将非流式上游错误转换为 502', async () => {
        const provider = createTestProvider()

        vi.mocked(provider.chat).mockRejectedValue(new Error('upstream failed'))

        await expect(chat({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream: false,
        }, provider)).rejects.toEqual(new BadGatewayError('Chat service failed'))
    })
})

/**
 * 创建可控制聊天结果的测试 Provider。
 */
function createTestProvider(): LlmProvider {
    return {
        chat: vi.fn(),
        generateStructuredOutput: vi.fn(),
    } as unknown as LlmProvider
}
