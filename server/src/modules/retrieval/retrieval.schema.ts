import { z } from 'zod'

export const transformQueryBodySchema = z.object({
    query: z.string().refine(value => value.trim().length > 0, {
        message: 'query must not be empty',
    }),
    provider: z.literal('deepseek'),
    model: z.string().trim().min(1),
})

const querySchema = z.string().trim().min(1)

export const queryTransformOutputSchema = z.discriminatedUnion('strategy', [
    z.object({
        strategy: z.literal('none'),
        queries: z.array(querySchema).length(1),
    }),
    z.object({
        strategy: z.literal('rewrite'),
        queries: z.array(querySchema).length(1),
    }),
    z.object({
        strategy: z.literal('expand'),
        queries: z.array(querySchema).min(1).max(3),
    }),
    z.object({
        strategy: z.literal('multi_query'),
        queries: z.array(querySchema).min(2).max(3),
    }),
    z.object({
        strategy: z.literal('decomposition'),
        queries: z.array(querySchema).min(2).max(3),
    }),
])

export type TransformQueryBody = z.infer<typeof transformQueryBodySchema>
export type QueryTransformOutput = z.infer<typeof queryTransformOutputSchema>
