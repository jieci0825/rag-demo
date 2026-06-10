import { ERROR_DEFINITIONS } from '../constants/error-definitions.js'
import { isKnownException } from '../lib/errors.js'
import { log } from '../lib/logger.js'
import { formatResponseDateTimes } from '../lib/time.js'

import type { Middleware } from 'koa'

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

            ctx.status = ERROR_DEFINITIONS.INTERNAL_SERVER_ERROR.status
            ctx.body = {
                errorCode: ERROR_DEFINITIONS.INTERNAL_SERVER_ERROR.errorCode,
                message: ERROR_DEFINITIONS.INTERNAL_SERVER_ERROR.message,
                data: null,
            }
        }
    }
}
