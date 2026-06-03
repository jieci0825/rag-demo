import { SuccessException } from '../../lib/errors.js'
import { createTextDocument } from './documents.service.js'

import type { Context } from 'koa'
import type { CreateTextDocumentBody } from './documents.schema.js'

/**
 * 处理创建纯文本文档请求。
 */
export async function createTextDocumentController(
    ctx: Context
): Promise<void> {
    console.log('触发', 'createTextDocumentController')

    const body = ctx.state.validated.body as CreateTextDocumentBody
    const document = await createTextDocument(body)

    throw new SuccessException(document, 202)
}
