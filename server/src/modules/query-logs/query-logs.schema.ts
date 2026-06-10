import { z } from 'zod'

export const queryLogsListQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
})

export const queryLogParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export type QueryLogsListQuery = z.infer<typeof queryLogsListQuerySchema>
export type QueryLogParams = z.infer<typeof queryLogParamsSchema>
