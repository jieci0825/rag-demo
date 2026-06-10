import Router from '@koa/router'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import { NotFoundError, SuccessException } from './lib/errors.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestId } from './middleware/request-id.js'
import { requestLogger } from './middleware/request-logger.js'
import { createDocumentsRoutes } from './modules/documents/documents.routes.js'
import { createQueryLogsRoutes } from './modules/query-logs/query-logs.routes.js'
import { createRetrievalRoutes } from './modules/retrieval/retrieval.routes.js'

/**
 * 创建并组装 Koa 应用实例。
 */
export function createApp(): Koa {
    const app = new Koa()
    const router = new Router()

    /**
     * 检查服务与数据库的健康状态
     * GET /health
     */
    router.get('/health', ctx => {
        throw new SuccessException({
            status: 'ok',
            database: 'ok',
        })
    })

    const documentsRoutes = createDocumentsRoutes()
    const queryLogsRoutes = createQueryLogsRoutes()
    const retrievalRoutes = createRetrievalRoutes()

    app.use(requestId())
    app.use(requestLogger())
    app.use(errorHandler())
    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
    app.use(documentsRoutes.routes())
    app.use(documentsRoutes.allowedMethods())
    app.use(queryLogsRoutes.routes())
    app.use(queryLogsRoutes.allowedMethods())
    app.use(retrievalRoutes.routes())
    app.use(retrievalRoutes.allowedMethods())
    app.use(ctx => {
        throw new NotFoundError()
    })

    return app
}
