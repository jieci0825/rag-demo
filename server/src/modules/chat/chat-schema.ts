import { z } from 'zod'

const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
})

const chatContextSchema = z.object({
    chunkId: z.number().int().positive(),
    headingPath: z.array(z.string().trim().min(1)),
    content: z.string().trim().min(1),
})

const chatBodyBaseSchema = z.object({
    provider: z.literal('deepseek'),
    model: z.string().trim().min(1),
    messages: z.array(chatMessageSchema).min(1).refine(
        messages => messages.at(-1)?.role === 'user',
        { message: 'last message must be a user message' },
    ),
    context: z.array(chatContextSchema),
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

export type ChatContext = ChatBody['context'][number]

export type NonStreamingChatBody = ChatBody & { stream: false }

export type StreamingChatBody = ChatBody & { stream: true }
