import { SuccessException } from '../../lib/errors.js'
import { transformQuery } from './retrieval.service.js'

import type { Context } from 'koa'
import type { TransformQueryBody } from './retrieval.schema.js'

/**
 * 改写用户查询以用于知识库检索
 * POST /api/retrieval/query-transform
 */
export async function transformQueryController(ctx: Context): Promise<void> {
    const body = ctx.state.validated.body as TransformQueryBody
    const result = await transformQuery(body)

    throw new SuccessException(result)
}
