import Router from '@koa/router'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import { AppError, ERROR_CODES } from './lib/errors.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestId } from './middleware/request-id.js'

/**
 * 创建并组装 Koa 应用实例。
 */
export function createApp(): Koa {
    const app = new Koa()
    const router = new Router()

    router.get('/health', ctx => {
        ctx.body = {
            status: 'ok',
            database: 'ok',
        }
    })

    app.use(errorHandler())
    app.use(requestId())
    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
    app.use(ctx => {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Route not found')
    })

    return app
}
