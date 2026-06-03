import { createDocumentChunks } from '../../modules/chunks/chunks.repository.js'
import { updateDocumentIndexStatus } from '../../modules/documents/documents.repository.js'
import { chunkText } from '../chunkers/recursive-chunker.js'
import { createQwenEmbeddingProvider } from '../embeddings/qwen-embedding.provider.js'
import { loadText } from '../loaders/text-loader.js'

export interface IndexTextDocumentInput {
    documentId: number
    content: string
}

/**
 * 将纯文本文档索引为 chunks 和 embedding，并更新文档状态。
 */
export async function indexTextDocument(input: IndexTextDocumentInput): Promise<void> {
    try {
        const text = loadText(input.content)
        const chunks = chunkText(text)

        if (chunks.length === 0) {
            throw new Error('Document content is empty after text loading')
        }

        const embeddingProvider = createQwenEmbeddingProvider()
        const embeddings = await embeddingProvider.embedTexts(chunks.map(chunk => chunk.content))

        await createDocumentChunks(chunks.map((chunk, chunkIndex) => ({
            documentId: input.documentId,
            chunkIndex,
            content: chunk.content,
            embedding: embeddings[chunkIndex],
            tokenCount: null,
            charCount: chunk.charCount,
            metadata: chunk.metadata,
        })))

        await updateDocumentIndexStatus(input.documentId, 'indexed')
    } catch (error) {
        await updateDocumentIndexStatus(input.documentId, 'failed', getIndexErrorMessage(error))
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
