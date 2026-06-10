import { unlink } from 'node:fs/promises'

import { SuccessException, ValidationError } from '../../lib/errors.js'
import { createFileDocumentBodySchema } from './documents.schema.js'
import { createFileDocument, createTextDocument } from './documents.service.js'

import type { Context } from 'koa'
import type { CreateTextDocumentBody } from './documents.schema.js'

/**
 * 处理创建纯文本文档请求。
 */
export async function createTextDocumentController(
    ctx: Context
): Promise<void> {
    const body = ctx.state.validated.body as CreateTextDocumentBody
    const document = await createTextDocument(body)

    throw new SuccessException(document, 202)
}

/**
 * 校验 multipart 字段并创建文件文档。
 */
export async function createFileDocumentController(ctx: Context): Promise<void> {
    const file = ctx.file

    if (!file) {
        throw new ValidationError({
            file: ['File is required'],
        })
    }

    const result = createFileDocumentBodySchema.safeParse(ctx.request.body)

    if (!result.success) {
        await unlink(file.path).catch(() => undefined)
        throw new ValidationError(result.error.flatten())
    }

    const document = await createFileDocument(result.data, file)

    throw new SuccessException(document, 202)
}
