import { BadGatewayError } from '../../lib/errors.js'
import { createLlmProvider } from '../../rag-core/llm/index.js'

import type {
    ChatChunk,
    ChatResult,
    LlmProvider,
} from '../../rag-core/llm/index.js'
import type {
    ChatBody,
    NonStreamingChatBody,
    StreamingChatBody,
} from './chat-schema.js'

/**
 * 以流式方式调用请求指定的大模型。
 */
export function chat(
    input: StreamingChatBody,
    llmProvider?: LlmProvider,
): AsyncIterable<ChatChunk>

/**
 * 以非流式方式调用请求指定的大模型。
 */
export function chat(
    input: NonStreamingChatBody,
    llmProvider?: LlmProvider,
): Promise<ChatResult>

/**
 * 根据请求配置选择流式或非流式聊天。
 */
export function chat(
    input: ChatBody,
    llmProvider = createLlmProvider(input.provider),
): AsyncIterable<ChatChunk> | Promise<ChatResult> {
    if (input.stream) {
        return streamChat(input, llmProvider)
    }

    return requestChat(input, llmProvider)
}

/**
 * 调用 Provider 获取完整聊天结果，并统一转换上游错误。
 */
async function requestChat(
    input: NonStreamingChatBody,
    llmProvider: LlmProvider,
): Promise<ChatResult> {
    try {
        return await llmProvider.chat(input.model, {
            messages: input.messages,
            stream: false,
        })
    } catch {
        throw new BadGatewayError('Chat service failed')
    }
}

/**
 * 转发 Provider 的聊天数据块，并统一转换上游错误。
 */
async function* streamChat(
    input: StreamingChatBody,
    llmProvider: LlmProvider,
): AsyncIterable<ChatChunk> {
    try {
        yield* llmProvider.chat(input.model, {
            messages: input.messages,
            stream: true,
        })
    } catch {
        throw new BadGatewayError('Chat service failed')
    }
}
