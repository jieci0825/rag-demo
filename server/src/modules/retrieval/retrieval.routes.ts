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
     * 执行查询转换、混合召回、RRF 融合和 Cross-Encoder 重排
     * POST /api/retrieval/search
     */
    router.post(
        '/api/retrieval/search',
        validateRequest({ body: searchKnowledgeBaseBodySchema }),
        searchKnowledgeBaseController,
    )

    return router
}
