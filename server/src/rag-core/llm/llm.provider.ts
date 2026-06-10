export type LlmMessageRole = 'system' | 'user' | 'assistant'

export interface LlmMessage {
    role: LlmMessageRole
    content: string
}

export interface ChatRequest {
    messages: LlmMessage[]
    stream: boolean
}

export interface StreamingChatRequest extends ChatRequest {
    stream: true
}

export interface NonStreamingChatRequest extends ChatRequest {
    stream: false
}

export interface ChatChunk {
    content: string
}

export interface ChatResult {
    content: string
}

export interface StructuredOutputRequest {
    messages: LlmMessage[]
    format: Record<string, unknown>
}

export interface LlmProvider {
    /**
     * 以流式方式调用指定模型进行聊天。
     */
    chat(
        model: string,
        request: StreamingChatRequest,
    ): AsyncIterable<ChatChunk>

    /**
     * 以非流式方式调用指定模型进行聊天。
     */
    chat(
        model: string,
        request: NonStreamingChatRequest,
    ): Promise<ChatResult>

    /**
     * 根据消息和 JSON Schema 生成结构化结果。
     */
    generateStructuredOutput(
        model: string,
        request: StructuredOutputRequest,
    ): Promise<unknown>
}

export type ChatResponse = AsyncIterable<ChatChunk> | Promise<ChatResult>

export type LlmProviderName = 'deepseek'
