import { eq } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { documents } from '../../db/schema.js'
import { getNow } from '../../lib/time.js'

import type { Document, NewDocument } from '../../db/schema.js'

export type DocumentStatus = 'pending' | 'indexed' | 'failed'

/**
 * 新增文档记录并返回数据库生成的完整文档。
 */
export async function createDocument(input: NewDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(input).returning()

    return document
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
            indexedAt: status === 'indexed' ? now : null,
            updatedAt: now,
        })
        .where(eq(documents.id, documentId))
}
