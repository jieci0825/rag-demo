import { isKnownException } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

import type { Middleware } from 'koa'
import type { Logger } from 'pino'

const INTERNAL_SERVER_ERROR_CODE = 500

/**
 * 将成功、已知错误、未知错误统一转换为稳定的 JSON 响应。
 */
export function errorHandler(): Middleware {
    return async (ctx, next) => {
        try {
            await next()
        } catch (error) {
            if (isKnownException(error)) {
                ctx.status = error.status
                ctx.body = {
                    errorCode: error.errorCode,
                    message: error.message,
                    data: error.data,
                }
                return
            }

            const currentLogger = ctx.state.logger as Logger | undefined

            (currentLogger ?? logger).error({
                err: error,
            }, 'Unhandled request error')

            ctx.status = 500
            ctx.body = {
                errorCode: INTERNAL_SERVER_ERROR_CODE,
                message: 'Internal server error',
                data: null,
            }
        }
    }
}
