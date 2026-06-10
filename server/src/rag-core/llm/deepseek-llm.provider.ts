import { env } from '../../config/env.js'

import type {
    ChatChunk,
    ChatRequest,
    ChatResponse,
    ChatResult,
    LlmMessage,
    LlmProvider,
    NonStreamingChatRequest,
    StreamingChatRequest,
    StructuredOutputRequest,
} from './llm.provider.js'

interface DeepSeekChatResponse {
    choices?: Array<{
        message?: {
            content?: unknown
        }
    }>
}

interface DeepSeekChatStreamResponse {
    choices?: Array<{
        delta?: {
            content?: unknown
        }
    }>
}

/**
 * 创建通过 DeepSeek Chat Completions API 调用模型的 provider。
 */
export function createDeepSeekLlmProvider(): LlmProvider {
    return {
        chat,
        generateStructuredOutput,
    }
}

/**
 * 以流式方式调用指定 DeepSeek 模型。
 */
function chat(
    model: string,
    request: StreamingChatRequest,
): AsyncIterable<ChatChunk>

/**
 * 以非流式方式调用指定 DeepSeek 模型。
 */
function chat(
    model: string,
    request: NonStreamingChatRequest,
): Promise<ChatResult>

/**
 * 根据请求配置选择 DeepSeek 流式或非流式聊天。
 */
function chat(
    model: string,
    request: ChatRequest,
): ChatResponse {
    if (request.stream) {
        return streamChat(model, request.messages)
    }

    return requestChat(model, request.messages)
}

/**
 * 请求 DeepSeek 非流式聊天并返回完整文本。
 */
async function requestChat(
    model: string,
    messages: LlmMessage[],
): Promise<ChatResult> {
    const response = await requestDeepSeek({
        model,
        messages,
        stream: false,
    })
    const data = (await response.json()) as DeepSeekChatResponse
    const content = data.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
        throw new Error('DeepSeek chat response missing message content')
    }

    return { content }
}

/**
 * 请求 DeepSeek 流式聊天并逐块解析 SSE 内容。
 */
async function* streamChat(
    model: string,
    messages: LlmMessage[],
): AsyncIterable<ChatChunk> {
    const response = await requestDeepSeek({
        model,
        messages,
        stream: true,
    })

    if (!response.body) {
        throw new Error('DeepSeek chat stream missing response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split(/\r?\n/)

        buffer = lines.pop() ?? ''

        for (const line of lines) {
            const content = parseStreamLine(line)

            if (content) {
                yield { content }
            }
        }
    }

    buffer += decoder.decode()

    if (buffer) {
        const content = parseStreamLine(buffer)

        if (content) {
            yield { content }
        }
    }
}

/**
 * 调用 DeepSeek JSON 模式并解析模型返回的结构化内容。
 */
async function generateStructuredOutput(
    model: string,
    request: StructuredOutputRequest,
): Promise<unknown> {
    const response = await requestDeepSeek({
        model,
        messages: withOutputFormat(request.messages, request.format),
        response_format: {
            type: 'json_object',
        },
        thinking: {
            type: 'disabled',
        },
        stream: false,
    })
    const data = (await response.json()) as DeepSeekChatResponse
    const content = data.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
        throw new Error('DeepSeek chat response missing message content')
    }

    return JSON.parse(content) as unknown
}

/**
 * 向 DeepSeek Chat Completions API 发送请求并校验响应状态。
 */
async function requestDeepSeek(
    body: Record<string, unknown>,
): Promise<Response> {
    const response = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        throw new Error(
            `DeepSeek chat request failed with status ${response.status}`
        )
    }

    return response
}

/**
 * 从 DeepSeek SSE 数据行中提取增量文本。
 */
function parseStreamLine(line: string): string | null {
    const trimmedLine = line.trim()

    if (!trimmedLine.startsWith('data:')) {
        return null
    }

    const data = trimmedLine.slice(5).trim()

    if (!data || data === '[DONE]') {
        return null
    }

    const event = JSON.parse(data) as DeepSeekChatStreamResponse
    const content = event.choices?.[0]?.delta?.content

    return typeof content === 'string' && content.length > 0
        ? content
        : null
}

/**
 * 将期望的 JSON Schema 附加到系统消息，约束 JSON 模式的输出结构。
 */
function withOutputFormat(
    messages: LlmMessage[],
    format: Record<string, unknown>,
): LlmMessage[] {
    const formatInstruction = [
        '仅返回符合此 JSON Schema 的 JSON 对象:',
        JSON.stringify(format),
    ].join('\n')
    const [firstMessage, ...remainingMessages] = messages

    if (firstMessage?.role === 'system') {
        return [
            {
                ...firstMessage,
                content: `${firstMessage.content}\n${formatInstruction}`,
            },
            ...remainingMessages,
        ]
    }

    return [
        {
            role: 'system',
            content: formatInstruction,
        },
        ...messages,
    ]
}
