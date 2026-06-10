import { SuccessException } from '../../lib/errors.js'
import { transformQuery } from './retrieval.service.js'

import type { Context } from 'koa'
import type { TransformQueryBody } from './retrieval.schema.js'

/**
 * 处理检索前的查询改写请求。
 */
export async function transformQueryController(ctx: Context): Promise<void> {
    const body = ctx.state.validated.body as TransformQueryBody
    const result = await transformQuery(body.query)

    throw new SuccessException(result)
}
