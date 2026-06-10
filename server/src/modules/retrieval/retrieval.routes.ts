import Router from '@koa/router'

import { validateRequest } from '../../middleware/validate.js'
import { transformQueryController } from './retrieval.controller.js'
import { transformQueryBodySchema } from './retrieval.schema.js'

/**
 * 创建 retrieval 模块路由。
 */
export function createRetrievalRoutes(): Router {
    const router = new Router()

    router.post(
        '/api/retrieval/query-transform',
        validateRequest({ body: transformQueryBodySchema }),
        transformQueryController,
    )

    return router
}
