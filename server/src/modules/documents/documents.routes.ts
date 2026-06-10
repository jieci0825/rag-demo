import Router from '@koa/router'

import { validateRequest } from '../../middleware/validate.js'
import {
    createFileDocumentController,
    createTextDocumentController,
} from './documents.controller.js'
import { uploadDocumentFile } from './document-upload.js'
import { createTextDocumentBodySchema } from './documents.schema.js'

/**
 * 创建 documents 模块路由。
 */
export function createDocumentsRoutes(): Router {
    const router = new Router()

    /**
     * 接受纯文本内容并创建文档
     * POST /api/documents/text
     */
    router.post(
        '/api/documents/text',
        validateRequest({ body: createTextDocumentBodySchema }),
        createTextDocumentController
    )

    /**
     * 上传文件并创建文档
     * POST /api/documents/file
     */
    router.post(
        '/api/documents/file',
        uploadDocumentFile(),
        createFileDocumentController
    )

    return router
}
