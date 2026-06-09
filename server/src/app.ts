import Router from '@koa/router'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import { NotFoundError, SuccessException } from './lib/errors.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestId } from './middleware/request-id.js'
import { requestLogger } from './middleware/request-logger.js'
import { createDocumentsRoutes } from './modules/documents/documents.routes.js'

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

    const documentsRoutes = createDocumentsRoutes()

    app.use(requestId())
    app.use(requestLogger())
    app.use(errorHandler())
    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
    app.use(documentsRoutes.routes())
    app.use(documentsRoutes.allowedMethods())
    app.use(ctx => {
        throw new NotFoundError()
    })

    return app
}
