export type LlmMessageRole = 'system' | 'user'

export interface LlmMessage {
    role: LlmMessageRole
    content: string
}

export interface StructuredOutputRequest {
    messages: LlmMessage[]
    format: Record<string, unknown>
}

export interface LlmProvider {
    /**
     * 根据消息和 JSON Schema 生成结构化结果。
     */
    generateStructuredOutput(request: StructuredOutputRequest): Promise<unknown>
}
