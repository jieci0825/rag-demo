import { log, runWithLogContext } from '../lib/logger.js'

import type { Middleware } from 'koa'

/**
 * 建立包含 request id 的日志上下文，并记录请求结果与耗时。
 */
export function requestLogger(): Middleware {
    return async (ctx, next) => {
        await runWithLogContext({
            requestId: ctx.state.requestId,
        }, async () => {
            const startedAt = Date.now()

            log('info', 'HTTP request started', {
                method: ctx.method,
                path: ctx.path,
            })

            await next()

            const logType = ctx.status >= 400 ? 'warn' : 'info'

            log(logType, 'HTTP request completed', {
                method: ctx.method,
                path: ctx.path,
                statusCode: ctx.status,
                durationMs: Date.now() - startedAt,
            })
        })
    }
}
