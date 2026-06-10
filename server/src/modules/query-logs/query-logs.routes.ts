import Router from '@koa/router'

import { validateRequest } from '../../middleware/validate.js'
import {
    getQueryLogDetailController,
    getQueryLogsController,
} from './query-logs.controller.js'
import {
    queryLogParamsSchema,
    queryLogsListQuerySchema,
} from './query-logs.schema.js'

/**
 * 创建 query-logs 模块路由。
 */
export function createQueryLogsRoutes(): Router {
    const router = new Router()

    /**
     * 分页获取查询日志列表
     * GET /api/query-logs
     */
    router.get(
        '/api/query-logs',
        validateRequest({ query: queryLogsListQuerySchema }),
        getQueryLogsController,
    )

    /**
     * 查询单条查询日志详情
     * GET /api/query-logs/:id
     */
    router.get(
        '/api/query-logs/:id',
        validateRequest({ params: queryLogParamsSchema }),
        getQueryLogDetailController,
    )

    return router
}
