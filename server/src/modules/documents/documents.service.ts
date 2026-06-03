import { createContentHash } from '../../lib/hash.js'
import { indexTextDocument } from '../../rag-core/indexer/index-document.js'
import { createDocument } from './documents.repository.js'

import type { Document } from '../../db/schema.js'
import type { CreateTextDocumentBody } from './documents.schema.js'

export interface CreatedTextDocument {
    id: number
    title: string
    sourceType: string
    status: string
    createdAt: Date
}

/**
 * 创建纯文本文档，并在进程内触发异步索引。
 */
export async function createTextDocument(input: CreateTextDocumentBody): Promise<CreatedTextDocument> {
    const document = await createDocument({
        title: input.title,
        sourceType: 'text',
        sourceUri: null,
        mimeType: 'text/plain',
        contentHash: createContentHash(input.content),
        metadata: input.metadata ?? {},
        status: 'pending',
        errorMessage: null,
        indexedAt: null,
    })

    void indexTextDocument({
        documentId: document.id,
        content: input.content,
    })

    return toCreatedTextDocument(document)
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
