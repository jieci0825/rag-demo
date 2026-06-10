import { z } from 'zod'

const chatMessageSchema = z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1),
})

const chatBodyBaseSchema = z.object({
    provider: z.literal('deepseek'),
    model: z.string().trim().min(1),
    messages: z.array(chatMessageSchema).min(1),
})

export const chatBodySchema = z.discriminatedUnion('stream', [
    chatBodyBaseSchema.extend({
        stream: z.literal(true),
    }),
    chatBodyBaseSchema.extend({
        stream: z.literal(false),
    }),
])

export type ChatBody = z.infer<typeof chatBodySchema>

export type NonStreamingChatBody = ChatBody & { stream: false }

export type StreamingChatBody = ChatBody & { stream: true }
