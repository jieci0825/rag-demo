import { isKnownException } from '../lib/errors.js'
import { log } from '../lib/logger.js'
import { formatResponseDateTimes } from '../lib/time.js'

import type { Middleware } from 'koa'

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
                    data: formatResponseDateTimes(error.data),
                }
                return
            }

            log('error', 'Unhandled request error', {
                err: error,
            })

            ctx.status = 500
            ctx.body = {
                errorCode: INTERNAL_SERVER_ERROR_CODE,
                message: 'Internal server error',
                data: null,
            }
        }
    }
}
