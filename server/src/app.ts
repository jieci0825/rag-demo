import cors from '@koa/cors'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'

import { ERROR_DEFINITIONS } from './constants/error-definitions.js'
import { AppError } from './lib/errors.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestId } from './middleware/request-id.js'
import { requestLogger } from './middleware/request-logger.js'
import { routes } from './middleware/routes.js'

/**
 * 创建并组装 Koa 应用实例。
 */
export function createApp(): Koa {
    const app = new Koa()

    app.use(cors())
    app.use(requestId())
    app.use(requestLogger())
    app.use(errorHandler())
    app.use(bodyParser())
    app.use(routes())
    app.use(ctx => {
        throw new AppError(ERROR_DEFINITIONS.ROUTE_NOT_FOUND)
    })

    return app
}
