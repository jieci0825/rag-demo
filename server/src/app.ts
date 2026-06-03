import Router from '@koa/router'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import { NotFoundError, SuccessException } from './lib/errors.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestId } from './middleware/request-id.js'

/**
 * 创建并组装 Koa 应用实例。
 */
export function createApp(): Koa {
    const app = new Koa()
    const router = new Router()

    router.get('/health', ctx => {
        throw new SuccessException({
            status: 'ok',
            database: 'ok',
        })
    })

    app.use(errorHandler())
    app.use(requestId())
    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
    app.use(ctx => {
        throw new NotFoundError()
    })

    return app
}
