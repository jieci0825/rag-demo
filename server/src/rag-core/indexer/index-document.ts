import { DOCUMENT_STATUS } from '../../constants/document-constants.js'
import { env } from '../../config/env.js'
import { createDocumentChunks } from '../../modules/chunks/chunks.repository.js'
import { updateDocumentIndexStatus } from '../../modules/documents/documents.repository.js'
import { chunkDocument } from '../chunkers/index.js'
import { createQwenEmbeddingProvider } from '../embeddings/qwen-embedding.provider.js'
import { parseDocument } from '../parsers/index.js'
import { buildEmbeddingText } from './build-embedding-text.js'
import { prepareChunksForIndexing } from './prepare-chunks-for-indexing.js'

import type { Logger } from 'pino'
import type { SupportedDocumentMimeType } from '../parsers/index.js'

export interface IndexDocumentInput {
    documentId: number
    content: string
    mimeType: SupportedDocumentMimeType
}

/**
 * 解析、切分并治理文档 chunks，使用结构上下文生成 embedding 后更新索引状态。
 */
export async function indexDocument(
    input: IndexDocumentInput,
    requestLogger: Logger,
): Promise<void> {
    const indexLogger = requestLogger.child({
        module: 'document-indexer',
        documentId: input.documentId,
    })
    const startedAt = Date.now()
    let stage = 'parse'
    let stageStartedAt = startedAt

    indexLogger.info({
        mimeType: input.mimeType,
        contentLength: input.content.length,
    }, 'Document indexing started')

    try {
        const document = parseDocument(input.content, input.mimeType)

        indexLogger.info({
            blockCount: document.blocks.length,
            durationMs: Date.now() - stageStartedAt,
        }, 'Document parsing completed')

        stage = 'chunk'
        stageStartedAt = Date.now()

        const rawChunks = chunkDocument(document)
        const chunks = prepareChunksForIndexing(rawChunks)

        indexLogger.info({
            rawChunkCount: rawChunks.length,
            chunkCount: chunks.length,
            durationMs: Date.now() - stageStartedAt,
        }, 'Document chunking completed')

        if (chunks.length === 0) {
            throw new Error('Document content is empty after cleaning')
        }

        stage = 'embedding'
        stageStartedAt = Date.now()

        const embeddingProvider = createQwenEmbeddingProvider()
        const embeddingTexts = chunks.map(buildEmbeddingText)

        indexLogger.info({
            model: env.EMBEDDING_MODEL,
            inputCount: embeddingTexts.length,
        }, 'Document embedding started')

        const embeddings = await embeddingProvider.embedTexts(embeddingTexts)

        indexLogger.info({
            model: env.EMBEDDING_MODEL,
            embeddingCount: embeddings.length,
            embeddingDimension: env.EMBEDDING_DIM,
            durationMs: Date.now() - stageStartedAt,
        }, 'Document embedding completed')

        stage = 'persist-chunks'
        stageStartedAt = Date.now()

        await createDocumentChunks(chunks.map((chunk, chunkIndex) => ({
            documentId: input.documentId,
            chunkIndex,
            content: chunk.content,
            embedding: embeddings[chunkIndex],
            tokenCount: null,
            charCount: chunk.charCount,
            metadata: chunk.metadata,
        })))

        indexLogger.info({
            chunkCount: chunks.length,
            durationMs: Date.now() - stageStartedAt,
        }, 'Document chunks persisted')

        stage = 'update-status'
        stageStartedAt = Date.now()

        await updateDocumentIndexStatus(input.documentId, DOCUMENT_STATUS.INDEXED)

        indexLogger.info({
            status: DOCUMENT_STATUS.INDEXED,
            stageDurationMs: Date.now() - stageStartedAt,
            durationMs: Date.now() - startedAt,
        }, 'Document indexing completed')
    } catch (error) {
        indexLogger.error({
            err: error,
            stage,
            durationMs: Date.now() - startedAt,
        }, 'Document indexing failed')

        try {
            await updateDocumentIndexStatus(
                input.documentId,
                DOCUMENT_STATUS.FAILED,
                getIndexErrorMessage(error),
            )
        } catch (statusError) {
            indexLogger.error({
                err: statusError,
                stage: 'mark-failed',
            }, 'Failed to persist document indexing failure status')
        }
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
