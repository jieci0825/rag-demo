import { DOCUMENT_STATUS } from '../../constants/document-constants.js'
import { createDocumentChunks } from '../../modules/chunks/chunks.repository.js'
import { updateDocumentIndexStatus } from '../../modules/documents/documents.repository.js'
import { chunkDocument } from '../chunkers/index.js'
import { createQwenEmbeddingProvider } from '../embeddings/qwen-embedding.provider.js'
import { parseDocument } from '../parsers/index.js'
import { buildEmbeddingText } from './build-embedding-text.js'

import type { SupportedDocumentMimeType } from '../parsers/index.js'

export interface IndexDocumentInput {
    documentId: number
    content: string
    mimeType: SupportedDocumentMimeType
}

/**
 * 解析并切分文档，使用结构上下文生成 embedding 后更新索引状态。
 */
export async function indexDocument(input: IndexDocumentInput): Promise<void> {
    try {
        const document = parseDocument(input.content, input.mimeType)
        const chunks = chunkDocument(document)

        if (chunks.length === 0) {
            throw new Error('Document content is empty after parsing')
        }

        const embeddingProvider = createQwenEmbeddingProvider()
        const embeddingTexts = chunks.map(buildEmbeddingText)
        const embeddings = await embeddingProvider.embedTexts(embeddingTexts)

        await createDocumentChunks(chunks.map((chunk, chunkIndex) => ({
            documentId: input.documentId,
            chunkIndex,
            content: chunk.content,
            embedding: embeddings[chunkIndex],
            tokenCount: null,
            charCount: chunk.charCount,
            metadata: chunk.metadata,
        })))

        await updateDocumentIndexStatus(input.documentId, DOCUMENT_STATUS.INDEXED)
    } catch (error) {
        await updateDocumentIndexStatus(
            input.documentId,
            DOCUMENT_STATUS.FAILED,
            getIndexErrorMessage(error),
        )
    }
}

/**
 * 将索引异常转换为可存储的错误信息。
 */
function getIndexErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return 'Unknown index error'
}
