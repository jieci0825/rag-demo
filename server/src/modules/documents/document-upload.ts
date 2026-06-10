import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import multer from '@koa/multer'
import { MulterError } from 'multer'

import { DOCUMENT_MIME_TYPE } from '../../constants/document-constants.js'
import { ERROR_DEFINITIONS } from '../../constants/error-definitions.js'
import { AppError } from '../../lib/errors.js'

import type { IncomingMessage } from 'node:http'
import type { Middleware } from 'koa'
import type { DocumentMimeType } from '../../constants/document-constants.js'

const UPLOAD_DIRECTORY = fileURLToPath(new URL('../../../uploads/', import.meta.url))
const supportedExtensions = new Set(['.md', '.txt'])

const storage = multer.diskStorage({
    destination: UPLOAD_DIRECTORY,
    filename: createUploadedFilename,
})

const uploader = multer({
    storage,
    fileFilter: filterSupportedDocument,
})

/**
 * 读取单个文档文件，并将 Multer 请求错误转换为统一校验错误。
 */
export function uploadDocumentFile(): Middleware {
    const middleware = uploader.single('file')

    return async (ctx, next) => {
        try {
            await middleware(ctx, next)
        } catch (error) {
            if (error instanceof MulterError) {
                throw new AppError(
                    ERROR_DEFINITIONS.INVALID_REQUEST_PAYLOAD,
                    {
                        file: [error.message],
                    },
                )
            }

            throw error
        }
    }
}

/**
 * 根据服务端保存的文件扩展名返回稳定的文档 MIME 类型。
 */
export function getDocumentMimeType(filename: string): DocumentMimeType {
    return extname(filename).toLowerCase() === '.md'
        ? DOCUMENT_MIME_TYPE.MARKDOWN
        : DOCUMENT_MIME_TYPE.TEXT
}

/**
 * 使用随机 ID 和已校验的扩展名生成磁盘文件名。
 */
function createUploadedFilename(
    _request: IncomingMessage,
    file: multer.File,
    callback: (error: Error | null, filename: string) => void,
): void {
    callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`)
}

/**
 * 只允许上传当前处理管线支持的 TXT 和 Markdown 文件。
 */
function filterSupportedDocument(
    _request: IncomingMessage,
    file: multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
): void {
    const extension = extname(file.originalname).toLowerCase()

    if (!supportedExtensions.has(extension)) {
        callback(
            new AppError(
                ERROR_DEFINITIONS.INVALID_REQUEST_PAYLOAD,
                {
                    file: ['Only .txt and .md files are supported'],
                },
            ),
            false,
        )
        return
    }

    callback(null, true)
}
