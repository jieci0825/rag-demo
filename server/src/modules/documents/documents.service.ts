import { unlink } from 'node:fs/promises'

import {
    DOCUMENT_MIME_TYPE,
    DOCUMENT_SOURCE_TYPE,
    DOCUMENT_STATUS,
} from '../../constants/document-constants.js'
import { ConflictError } from '../../lib/errors.js'
import { createContentHash } from '../../lib/hash.js'
import { indexDocument } from '../../rag-core/indexer/index-document.js'
import { loadFile } from '../../rag-core/loaders/file-loader.js'
import { getDocumentMimeType } from './document-upload.js'
import {
    createDocument,
    existsDocumentByContentHash,
} from './documents.repository.js'

import type { Logger } from 'pino'
import type { Document } from '../../db/schema.js'
import type { CreateFileDocumentBody, CreateTextDocumentBody } from './documents.schema.js'

export interface UploadedDocumentFile {
    filename: string
    originalname: string
    path: string
}

export interface CreatedTextDocument {
    id: number
    title: string
    sourceType: string
    status: string
    createdAt: Date
}

export interface CreatedFileDocument extends CreatedTextDocument {
    sourceUri: string | null
    mimeType: string | null
}

/**
 * 创建纯文本文档，并在进程内触发异步索引。
 */
export async function createTextDocument(
    input: CreateTextDocumentBody,
    requestLogger: Logger,
): Promise<CreatedTextDocument> {
    const operationLogger = requestLogger.child({
        module: 'documents',
        sourceType: DOCUMENT_SOURCE_TYPE.TEXT,
    })
    const startedAt = Date.now()

    operationLogger.info({
        contentLength: input.content.length,
    }, 'Text document creation started')

    const contentHash = createContentHash(input.content)
    await assertContentHashAvailable(contentHash)

    const document = await createDocument({
        title: input.title,
        sourceType: DOCUMENT_SOURCE_TYPE.TEXT,
        sourceUri: null,
        mimeType: DOCUMENT_MIME_TYPE.TEXT,
        contentHash,
        metadata: input.metadata ?? {},
        status: DOCUMENT_STATUS.PENDING,
        errorMessage: null,
        indexedAt: null,
    })

    operationLogger.info({
        documentId: document.id,
        durationMs: Date.now() - startedAt,
    }, 'Text document record created')

    void indexDocument({
        documentId: document.id,
        content: input.content,
        mimeType: DOCUMENT_MIME_TYPE.TEXT,
    }, operationLogger)

    return toCreatedTextDocument(document)
}

/**
 * 读取磁盘文件并创建文档记录，失败时清理已上传文件。
 */
export async function createFileDocument(
    input: CreateFileDocumentBody,
    file: UploadedDocumentFile,
    requestLogger: Logger,
): Promise<CreatedFileDocument> {
    const operationLogger = requestLogger.child({
        module: 'documents',
        sourceType: DOCUMENT_SOURCE_TYPE.FILE,
    })
    const startedAt = Date.now()

    try {
        const loadStartedAt = Date.now()

        operationLogger.info({
            storedFilename: file.filename,
        }, 'Document file loading started')

        const content = await loadFile(file.path)

        operationLogger.info({
            storedFilename: file.filename,
            contentLength: content.length,
            durationMs: Date.now() - loadStartedAt,
        }, 'Document file loaded')

        const contentHash = createContentHash(content)
        await assertContentHashAvailable(contentHash)

        const mimeType = getDocumentMimeType(file.filename)
        const sourceUri = `/uploads/${file.filename}`
        const document = await createDocument({
            title: input.title ?? file.originalname,
            sourceType: DOCUMENT_SOURCE_TYPE.FILE,
            sourceUri,
            mimeType,
            contentHash,
            metadata: input.metadata ?? {},
            status: DOCUMENT_STATUS.PENDING,
            errorMessage: null,
            indexedAt: null,
        })

        operationLogger.info({
            documentId: document.id,
            mimeType,
            durationMs: Date.now() - startedAt,
        }, 'File document record created')

        void indexDocument({
            documentId: document.id,
            content,
            mimeType,
        }, operationLogger)

        return {
            ...toCreatedTextDocument(document),
            sourceUri: document.sourceUri,
            mimeType: document.mimeType,
        }
    } catch (error) {
        await unlink(file.path).catch(() => undefined)
        operationLogger.error({
            err: error,
            storedFilename: file.filename,
            durationMs: Date.now() - startedAt,
        }, 'File document creation failed')
        throw error
    }
}

/**
 * 拒绝创建与现有文档内容哈希相同的文档。
 */
async function assertContentHashAvailable(contentHash: string): Promise<void> {
    if (await existsDocumentByContentHash(contentHash)) {
        throw new ConflictError('Document content already exists')
    }
}

/**
 * 转换为创建接口需要返回的字段。
 */
function toCreatedTextDocument(document: Document): CreatedTextDocument {
    return {
        id: document.id,
        title: document.title,
        sourceType: document.sourceType,
        status: document.status,
        createdAt: document.createdAt,
    }
}
