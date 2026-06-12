import Router from '@koa/router'

import { SuccessException } from '../lib/errors.js'
import { createChatRoutes } from '../modules/chat/index.js'
import { createDocumentsRoutes } from '../modules/documents/documents.routes.js'
import { createQueryLogsRoutes } from '../modules/query-logs/query-logs.routes.js'
import { createRetrievalRoutes } from '../modules/retrieval/retrieval.routes.js'

import type { RouterMiddleware } from '@koa/router'

/**
 * 创建包含全部 HTTP 路由的统一中间件。
 */
export function routes(): RouterMiddleware {
    const router = new Router()

    /**
     * 检查服务与数据库的健康状态
     * GET /api/health
     */
    router.get('/api/health', ctx => {
        throw new SuccessException({
            status: 'ok',
            database: 'ok',
        })
    })

    const routeGroups = [
        createChatRoutes(),
        createDocumentsRoutes(),
        createQueryLogsRoutes(),
        createRetrievalRoutes(),
    ]

    for (const routeGroup of routeGroups) {
        router.use(routeGroup.routes())
        router.use(routeGroup.allowedMethods())
    }

    const dispatchRoutes = router.routes()
    const handleAllowedMethods = router.allowedMethods()

    return async (ctx, next) => {
        await dispatchRoutes(ctx, () => handleAllowedMethods(ctx, next))
    }
}
