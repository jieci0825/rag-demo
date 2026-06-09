import { logger } from '../lib/logger.js'

import type { Middleware } from 'koa'

/**
 * 为当前请求创建绑定 request id 的 logger，并记录请求结果与耗时。
 */
export function requestLogger(): Middleware {
    return async (ctx, next) => {
        const startedAt = Date.now()
        const currentLogger = logger.child({
            requestId: ctx.state.requestId,
        })

        ctx.state.logger = currentLogger
        currentLogger.info({
            method: ctx.method,
            path: ctx.path,
        }, 'HTTP request started')

        await next()

        const logRequestCompleted = ctx.status >= 400
            ? currentLogger.warn.bind(currentLogger)
            : currentLogger.info.bind(currentLogger)

        logRequestCompleted({
            method: ctx.method,
            path: ctx.path,
            statusCode: ctx.status,
            durationMs: Date.now() - startedAt,
        }, 'HTTP request completed')
    }
}
