import { Readable } from 'node:stream'

import { SuccessException } from '../../lib/errors.js'
import { log } from '../../lib/logger.js'
import { chat } from './chat-service.js'

import type { Context } from 'koa'
import type { ChatChunk } from '../../rag-core/llm/index.js'
import type { ChatBody } from './chat-schema.js'

/**
 * 根据对话历史和检索资料执行知识库聊天，支持普通 JSON 与 JSON SSE 响应
 * POST /api/chat
 */
export async function chatController(ctx: Context): Promise<void> {
    const body = ctx.state.validated.body as ChatBody

    if (body.stream) {
        ctx.status = 200
        ctx.type = 'text/event-stream'
        ctx.set('Cache-Control', 'no-cache')
        ctx.set('Connection', 'keep-alive')
        ctx.body = Readable.from(createChatEventStream(
            chat(body),
            body.provider,
            body.model,
        ))
        return
    }

    const result = await chat(body)

    throw new SuccessException(result)
}

/**
 * 将模型数据块转换为 JSON SSE 事件，并在结束或失败时输出终止事件。
 */
async function* createChatEventStream(
    chunks: AsyncIterable<ChatChunk>,
    provider: string,
    model: string,
): AsyncIterable<string> {
    try {
        for await (const chunk of chunks) {
            yield formatSseEvent({
                type: 'content',
                content: chunk.content,
            })
        }

        yield formatSseEvent({ type: 'done' })
    } catch (error) {
        log('error', 'Streaming chat failed', {
            err: error,
            provider,
            model,
        })
        yield formatSseEvent({
            type: 'error',
            message: error instanceof Error
                ? error.message
                : 'Chat service failed',
        })
    }
}

/**
 * 将聊天事件序列化为 SSE data 行。
 */
function formatSseEvent(event: ChatStreamEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`
}

type ChatStreamEvent =
    | { type: 'content', content: string }
    | { type: 'done' }
    | { type: 'error', message: string }
