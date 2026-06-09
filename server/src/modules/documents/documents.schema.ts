import { z } from 'zod'

export const createTextDocumentBodySchema = z.object({
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
})

export const createFileDocumentBodySchema = z.object({
    title: z.string().trim().min(1).optional(),
    metadata: z.string().optional().transform(parseMetadata),
})

export type CreateTextDocumentBody = z.infer<typeof createTextDocumentBodySchema>
export type CreateFileDocumentBody = z.infer<typeof createFileDocumentBodySchema>

/**
 * 将 multipart 中的 metadata JSON 字符串转换为对象。
 */
function parseMetadata(
    value: string | undefined,
    context: z.RefinementCtx,
): Record<string, unknown> | undefined {
    if (value === undefined || value.trim().length === 0) {
        return undefined
    }

    try {
        const metadata = JSON.parse(value)

        if (metadata === null || Array.isArray(metadata) || typeof metadata !== 'object') {
            context.addIssue({
                code: 'custom',
                message: 'metadata must be a JSON object',
            })
            return z.NEVER
        }

        return metadata as Record<string, unknown>
    } catch {
        context.addIssue({
            code: 'custom',
            message: 'metadata must be valid JSON',
        })
        return z.NEVER
    }
}
