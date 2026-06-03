import Router from '@koa/router'

import { validateRequest } from '../../middleware/validate.js'
import { createTextDocumentController } from './documents.controller.js'
import { createTextDocumentBodySchema } from './documents.schema.js'

/**
 * 创建 documents 模块路由。
 */
export function createDocumentsRoutes(): Router {
    const router = new Router()

    router.post('/api/documents/text', validateRequest({ body: createTextDocumentBodySchema }), createTextDocumentController)

    return router
}
