import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ERROR_DEFINITIONS } from '../src/constants/error-definitions.js'
import { AppError } from '../src/lib/errors.js'
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
            context: [{
                chunkId: 2,
                headingPath: ['自定义 Logger'],
                content: 'Fastify 使用 pino 记录日志。',
            }],
            stream: false,
        })).resolves.toEqual({
            content: '完整回复',
        })

        expect(mocks.createLlmProvider).toHaveBeenCalledWith('deepseek')
        expect(provider.chat).toHaveBeenCalledWith('deepseek-v4-pro', {
            messages: [
                {
                    role: 'system',
                    content: expect.stringContaining('只能根据本轮提供的知识库资料'),
                },
                {
                    role: 'user',
                    content: [
                        '你好',
                        '本轮知识库资料：',
                        '[资料1]\n'
                        + 'chunkId：2\n'
                        + '标题：自定义 Logger\n'
                        + '内容：Fastify 使用 pino 记录日志。',
                    ].join('\n\n'),
                },
            ],
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
            context: [{
                chunkId: 1,
                headingPath: [],
                content: '日志内容',
            }],
            stream: false,
        }, provider)).rejects.toEqual(
            new AppError(ERROR_DEFINITIONS.CHAT_SERVICE_FAILED),
        )
    })

    it('为流式聊天注入系统提示词和检索资料', async () => {
        const provider = createTestProvider()

        vi.mocked(provider.chat).mockReturnValue(createChunks(['流式回复']))

        const chunks = chat({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            messages: [{
                role: 'user',
                content: 'Fastify 如何记录日志？',
            }],
            context: [{
                chunkId: 3,
                headingPath: ['自定义 Logger'],
                content: 'Fastify 使用 pino 作为日志工具。',
            }],
            stream: true,
        }, provider)

        await expect(readChunks(chunks)).resolves.toEqual(['流式回复'])
        expect(provider.chat).toHaveBeenCalledWith('deepseek-v4-flash', {
            messages: [
                {
                    role: 'system',
                    content: expect.stringContaining('知识库问答助手'),
                },
                {
                    role: 'user',
                    content: expect.stringContaining(
                        '[资料1]\n'
                        + 'chunkId：3\n'
                        + '标题：自定义 Logger\n'
                        + '内容：Fastify 使用 pino 作为日志工具。',
                    ),
                },
            ],
            stream: true,
        })
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

/**
 * 创建依次返回指定文本的数据块。
 */
async function* createChunks(contents: string[]) {
    for (const content of contents) {
        yield { content }
    }
}

/**
 * 读取流式聊天结果中的文本内容。
 */
async function readChunks(
    chunks: AsyncIterable<{ content: string }>,
): Promise<string[]> {
    const contents: string[] = []

    for await (const chunk of chunks) {
        contents.push(chunk.content)
    }

    return contents
}
