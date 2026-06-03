import { isKnownException } from '../lib/errors.js'
import { env } from '../config/env.js'

import type { Middleware } from 'koa'

const INTERNAL_SERVER_ERROR_CODE = 500
const isProduction = env.NODE_ENV === 'production'

console.log('NODE_ENV:', env.NODE_ENV)

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

            if (!isProduction) {
                console.log(error)
            }

            ctx.status = 500
            ctx.body = {
                errorCode: INTERNAL_SERVER_ERROR_CODE,
                message: 'Internal server error',
                data: null,
            }
        }
    }
}
