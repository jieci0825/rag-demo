import { z } from 'zod'

export const createTextDocumentBodySchema = z.object({
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateTextDocumentBody = z.infer<typeof createTextDocumentBodySchema>
