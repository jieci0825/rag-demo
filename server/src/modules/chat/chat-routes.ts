import Router from '@koa/router'

import { validateRequest } from '../../middleware/validate.js'
import { chatController } from './chat-controller.js'
import { chatBodySchema } from './chat-schema.js'

/**
 * 创建聊天模块路由。
 */
export function createChatRoutes(): Router {
    const router = new Router()

    /**
     * 使用指定模型执行聊天，支持普通 JSON 与 JSON SSE 响应
     * POST /api/chat
     */
    router.post(
        '/api/chat',
        validateRequest({ body: chatBodySchema }),
        chatController,
    )

    return router
}
