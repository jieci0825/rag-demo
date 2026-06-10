import { DOCUMENT_STATUS } from '../../constants/document-constants.js'
import { env } from '../../config/env.js'
import { log } from '../../lib/logger.js'
import { createDocumentChunks } from '../../modules/chunks/chunks.repository.js'
import { updateDocumentIndexStatus } from '../../modules/documents/documents.repository.js'
import { chunkDocument } from '../chunkers/index.js'
import { createQwenEmbeddingProvider } from '../embeddings/qwen-embedding.provider.js'
import { parseDocument } from '../parsers/index.js'
import { buildEmbeddingText } from './build-embedding-text.js'
import { prepareChunksForIndexing } from './prepare-chunks-for-indexing.js'

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
): Promise<void> {
    const startedAt = Date.now()
    let stage = 'parse'
    let stageStartedAt = startedAt

    log('info', 'Document indexing started', {
        module: 'document-indexer',
        documentId: input.documentId,
        mimeType: input.mimeType,
        contentLength: input.content.length,
    })

    try {
        const document = parseDocument(input.content, input.mimeType)

        log('info', 'Document parsing completed', {
            module: 'document-indexer',
            documentId: input.documentId,
            blockCount: document.blocks.length,
            durationMs: Date.now() - stageStartedAt,
        })

        stage = 'chunk'
        stageStartedAt = Date.now()

        const rawChunks = chunkDocument(document)
        const chunks = prepareChunksForIndexing(rawChunks)

        log('info', 'Document chunking completed', {
            module: 'document-indexer',
            documentId: input.documentId,
            rawChunkCount: rawChunks.length,
            chunkCount: chunks.length,
            durationMs: Date.now() - stageStartedAt,
        })

        if (chunks.length === 0) {
            throw new Error('Document content is empty after cleaning')
        }

        stage = 'embedding'
        stageStartedAt = Date.now()

        const embeddingProvider = createQwenEmbeddingProvider()
        const embeddingTexts = chunks.map(buildEmbeddingText)

        log('info', 'Document embedding started', {
            module: 'document-indexer',
            documentId: input.documentId,
            model: env.EMBEDDING_MODEL,
            inputCount: embeddingTexts.length,
        })

        const embeddings = await embeddingProvider.embedTexts(embeddingTexts)

        log('info', 'Document embedding completed', {
            module: 'document-indexer',
            documentId: input.documentId,
            model: env.EMBEDDING_MODEL,
            embeddingCount: embeddings.length,
            embeddingDimension: env.EMBEDDING_DIM,
            durationMs: Date.now() - stageStartedAt,
        })

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

        log('info', 'Document chunks persisted', {
            module: 'document-indexer',
            documentId: input.documentId,
            chunkCount: chunks.length,
            durationMs: Date.now() - stageStartedAt,
        })

        stage = 'update-status'
        stageStartedAt = Date.now()

        await updateDocumentIndexStatus(input.documentId, DOCUMENT_STATUS.INDEXED)

        log('info', 'Document indexing completed', {
            module: 'document-indexer',
            documentId: input.documentId,
            status: DOCUMENT_STATUS.INDEXED,
            stageDurationMs: Date.now() - stageStartedAt,
            durationMs: Date.now() - startedAt,
        })
    } catch (error) {
        log('error', 'Document indexing failed', {
            module: 'document-indexer',
            documentId: input.documentId,
            err: error,
            stage,
            durationMs: Date.now() - startedAt,
        })

        try {
            await updateDocumentIndexStatus(
                input.documentId,
                DOCUMENT_STATUS.FAILED,
                getIndexErrorMessage(error),
            )
        } catch (statusError) {
            log('error', 'Failed to persist document indexing failure status', {
                module: 'document-indexer',
                documentId: input.documentId,
                err: statusError,
                stage: 'mark-failed',
            })
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
