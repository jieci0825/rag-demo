import Router from '@koa/router'

import { validateRequest } from '../../middleware/validate.js'
import { transformQueryController } from './retrieval.controller.js'
import { transformQueryBodySchema } from './retrieval.schema.js'

/**
 * 创建 retrieval 模块路由。
 */
export function createRetrievalRoutes(): Router {
    const router = new Router()

    /**
     * 选择转换策略并生成用于知识库检索的查询
     * POST /api/retrieval/query-transform
     */
    router.post(
        '/api/retrieval/query-transform',
        validateRequest({ body: transformQueryBodySchema }),
        transformQueryController,
    )

    return router
}
