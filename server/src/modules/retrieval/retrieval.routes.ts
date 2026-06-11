import Router from '@koa/router'

import { validateRequest } from '../../middleware/validate.js'
import {
    searchKnowledgeBaseController,
    transformQueryController,
} from './retrieval.controller.js'
import {
    searchKnowledgeBaseBodySchema,
    transformQueryBodySchema,
} from './retrieval.schema.js'

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

    /**
     * 执行查询转换、混合召回和 RRF 结果融合
     * POST /api/retrieval/search
     */
    router.post(
        '/api/retrieval/search',
        validateRequest({ body: searchKnowledgeBaseBodySchema }),
        searchKnowledgeBaseController,
    )

    return router
}
