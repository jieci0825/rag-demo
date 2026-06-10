import { describe, expect, it, vi } from 'vitest'

import { chatController } from '../src/modules/chat/chat-controller.js'

import type { Context } from 'koa'

const mocks = vi.hoisted(() => ({
    chat: vi.fn(),
    log: vi.fn(),
}))

vi.mock('../src/modules/chat/chat-service.js', () => ({
    chat: mocks.chat,
}))

vi.mock('../src/lib/logger.js', () => ({
    log: mocks.log,
}))

describe('聊天 Controller', () => {
    it('将流式聊天数据转换为 JSON SSE 事件', async () => {
        mocks.chat.mockReturnValue(createChunks(['你', '好']))
        const ctx = createContext()

        await chatController(ctx)

        expect(ctx.type).toBe('text/event-stream')
        await expect(readBody(ctx.body)).resolves.toBe(
            'data: {"type":"content","content":"你"}\n\n'
            + 'data: {"type":"content","content":"好"}\n\n'
            + 'data: {"type":"done"}\n\n',
        )
    })

    it('将流式异常转换为 JSON error 事件', async () => {
        mocks.chat.mockReturnValue(createFailedChunks())
        const ctx = createContext()

        await chatController(ctx)

        await expect(readBody(ctx.body)).resolves.toBe(
            'data: {"type":"error","message":"stream failed"}\n\n',
        )
    })
})

/**
 * 创建流式聊天测试上下文。
 */
function createContext(): Context {
    return {
        state: {
            validated: {
                body: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash',
                    messages: [{
                        role: 'user',
                        content: '你好',
                    }],
                    stream: true,
                },
            },
        },
        set: vi.fn(),
    } as unknown as Context
}

/**
 * 创建依次输出指定文本的数据块。
 */
async function* createChunks(contents: string[]) {
    for (const content of contents) {
        yield { content }
    }
}

/**
 * 创建会抛出异常的流式数据块。
 */
async function* createFailedChunks() {
    throw new Error('stream failed')
    yield { content: '' }
}

/**
 * 读取 Controller 设置的流式响应内容。
 */
async function readBody(body: unknown): Promise<string> {
    let output = ''

    for await (const chunk of body as AsyncIterable<Buffer>) {
        output += chunk.toString()
    }

    return output
}
