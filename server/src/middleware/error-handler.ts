import { ERROR_CODES, isAppError } from '../lib/errors.js'

import type { Middleware } from 'koa'

/**
 * 将所有异常转换为稳定的 JSON 错误响应。
 */
export function errorHandler(): Middleware {
    return async (ctx, next) => {
        try {
            await next()
        } catch (error) {
            if (isAppError(error)) {
                ctx.status = error.status
                ctx.body = {
                    error: {
                        code: error.code,
                        message: error.message,
                        details: error.details ?? {},
                    },
                }
                return
            }

            ctx.status = 500
            ctx.body = {
                error: {
                    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
                    message: 'Internal server error',
                    details: {},
                },
            }
        }
    }
}
