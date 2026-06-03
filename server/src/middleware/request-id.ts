import { randomUUID } from 'node:crypto'

import type { Middleware } from 'koa'

const REQUEST_ID_HEADER = 'X-Request-Id'

/**
 * 为每个请求补齐 request id，并写回响应头。
 */
export function requestId(): Middleware {
    return async (ctx, next) => {
        const requestId = ctx.get(REQUEST_ID_HEADER) || randomUUID()

        ctx.state.requestId = requestId
        ctx.set(REQUEST_ID_HEADER, requestId)

        await next()
    }
}
