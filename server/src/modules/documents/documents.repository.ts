import { eq } from 'drizzle-orm'

import { DOCUMENT_STATUS } from '../../constants/document-constants.js'
import { ERROR_DEFINITIONS } from '../../constants/error-definitions.js'
import { db } from '../../db/index.js'
import { documents } from '../../db/schema.js'
import { AppError } from '../../lib/errors.js'
import { getNow } from '../../lib/time.js'

import type { DocumentStatus } from '../../constants/document-constants.js'
import type { Document, NewDocument } from '../../db/schema.js'

/**
 * 新增文档记录，并将并发导致的内容哈希唯一冲突转换为业务错误。
 */
export async function createDocument(input: NewDocument): Promise<Document> {
    try {
        const [document] = await db.insert(documents).values(input).returning()

        return document
    } catch (error) {
        if (isContentHashUniqueViolation(error)) {
            throw new AppError(ERROR_DEFINITIONS.DOCUMENT_CONTENT_ALREADY_EXISTS)
        }

        throw error
    }
}

/**
 * 判断指定内容哈希是否已经存在文档记录。
 */
export async function existsDocumentByContentHash(contentHash: string): Promise<boolean> {
    const [document] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.contentHash, contentHash))
        .limit(1)

    return document !== undefined
}

/**
 * 更新文档索引状态和相关时间、错误信息。
 */
export async function updateDocumentIndexStatus(
    documentId: number,
    status: DocumentStatus,
    errorMessage: string | null = null,
): Promise<void> {
    const now = getNow()

    await db
        .update(documents)
        .set({
            status,
            errorMessage,
            indexedAt: status === DOCUMENT_STATUS.INDEXED ? now : null,
            updatedAt: now,
        })
        .where(eq(documents.id, documentId))
}

/**
 * 判断数据库错误是否来自文档内容哈希唯一索引。
 */
function isContentHashUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false
    }

    const cause = 'cause' in error ? error.cause : error

    if (typeof cause !== 'object' || cause === null) {
        return false
    }

    const databaseError = cause as {
        code?: unknown
        constraint?: unknown
    }

    return databaseError.code === '23505'
        && databaseError.constraint === 'uniq_documents_content_hash'
}
