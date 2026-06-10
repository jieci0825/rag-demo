import { z } from 'zod'

export const transformQueryBodySchema = z.object({
    query: z.string().refine(value => value.trim().length > 0, {
        message: 'query must not be empty',
    }),
    provider: z.literal('deepseek'),
    model: z.string().trim().min(1),
})

export const rewrittenQuerySchema = z.object({
    rewrittenQuery: z.string().trim().min(1),
})

export type TransformQueryBody = z.infer<typeof transformQueryBodySchema>
