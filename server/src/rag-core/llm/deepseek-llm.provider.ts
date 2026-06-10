import { env } from '../../config/env.js'

import type { LlmMessage, LlmProvider, StructuredOutputRequest } from './llm.provider.js'

interface DeepSeekChatResponse {
    choices?: Array<{
        message?: {
            content?: unknown
        }
    }>
}

/**
 * 创建通过 DeepSeek Chat Completions API 调用模型的 provider。
 */
export function createDeepSeekLlmProvider(): LlmProvider {
    return {
        generateStructuredOutput,
    }
}

/**
 * 调用 DeepSeek JSON 模式并解析模型返回的结构化内容。
 */
async function generateStructuredOutput(request: StructuredOutputRequest): Promise<unknown> {
    const response = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: env.DEEPSEEK_MODEL,
            messages: withOutputFormat(request.messages, request.format),
            response_format: {
                type: 'json_object',
            },
            thinking: {
                type: 'disabled',
            },
            stream: false,
        }),
    })

    if (!response.ok) {
        throw new Error(`DeepSeek chat request failed with status ${response.status}`)
    }

    const data = (await response.json()) as DeepSeekChatResponse
    const content = data.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
        throw new Error('DeepSeek chat response missing message content')
    }

    return JSON.parse(content) as unknown
}

/**
 * 将期望的 JSON Schema 附加到系统消息，约束 JSON 模式的输出结构。
 */
function withOutputFormat(
    messages: LlmMessage[],
    format: Record<string, unknown>,
): LlmMessage[] {
    const formatInstruction = [
        'Return only a JSON object matching this JSON Schema:',
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
