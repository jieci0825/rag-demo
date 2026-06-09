import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DOCUMENT_STATUS } from '../src/constants/document-constants.js'
import { indexDocument } from '../src/rag-core/indexer/index-document.js'

import type { Logger } from 'pino'

const mocks = vi.hoisted(() => ({
    chunkDocument: vi.fn(),
    createDocumentChunks: vi.fn(),
    embedTexts: vi.fn(),
    parseDocument: vi.fn(),
    prepareChunksForIndexing: vi.fn(),
    updateDocumentIndexStatus: vi.fn(),
}))

vi.mock('../src/config/env.js', () => ({
    env: {
        EMBEDDING_DIM: 2,
        EMBEDDING_MODEL: 'test-embedding-model',
    },
}))

vi.mock('../src/modules/chunks/chunks.repository.js', () => ({
    createDocumentChunks: mocks.createDocumentChunks,
}))

vi.mock('../src/modules/documents/documents.repository.js', () => ({
    updateDocumentIndexStatus: mocks.updateDocumentIndexStatus,
}))

vi.mock('../src/rag-core/chunkers/index.js', () => ({
    chunkDocument: mocks.chunkDocument,
}))

vi.mock('../src/rag-core/embeddings/qwen-embedding.provider.js', () => ({
    createQwenEmbeddingProvider: vi.fn(() => ({
        embedText: vi.fn(),
        embedTexts: mocks.embedTexts,
    })),
}))

vi.mock('../src/rag-core/parsers/index.js', () => ({
    parseDocument: mocks.parseDocument,
}))

vi.mock('../src/rag-core/indexer/prepare-chunks-for-indexing.js', () => ({
    prepareChunksForIndexing: mocks.prepareChunksForIndexing,
}))

const logSpies = {
    error: vi.fn(),
    info: vi.fn(),
}
const testLogger = {
    child: vi.fn(() => ({
        error: logSpies.error,
        info: logSpies.info,
    })),
} as unknown as Logger

describe('文档索引日志流程', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.parseDocument.mockReturnValue({
            blocks: [{ type: 'paragraph', content: 'content' }],
        })
        mocks.chunkDocument.mockReturnValue([{
            content: 'content',
            charCount: 7,
            metadata: {
                headingPath: [],
            },
        }])
        mocks.prepareChunksForIndexing.mockImplementation(chunks => chunks)
        mocks.embedTexts.mockResolvedValue([[0.1, 0.2]])
        mocks.createDocumentChunks.mockResolvedValue(undefined)
        mocks.updateDocumentIndexStatus.mockResolvedValue(undefined)
    })

    it('完成解析、分块、向量生成和入库后更新索引状态', async () => {
        await indexDocument({
            documentId: 1,
            content: 'content',
            mimeType: 'text/plain',
        }, testLogger)

        expect(mocks.createDocumentChunks).toHaveBeenCalledWith([{
            documentId: 1,
            chunkIndex: 0,
            content: 'content',
            embedding: [0.1, 0.2],
            tokenCount: null,
            charCount: 7,
            metadata: {
                headingPath: [],
            },
        }])
        expect(mocks.updateDocumentIndexStatus).toHaveBeenCalledWith(
            1,
            DOCUMENT_STATUS.INDEXED,
        )
        expect(logSpies.info).toHaveBeenCalledWith(
            expect.objectContaining({
                status: DOCUMENT_STATUS.INDEXED,
            }),
            'Document indexing completed',
        )
    })

    it('向量生成失败时记录阶段并将文档标记为失败', async () => {
        const error = new Error('embedding failed')

        mocks.embedTexts.mockRejectedValue(error)

        await indexDocument({
            documentId: 2,
            content: 'content',
            mimeType: 'text/plain',
        }, testLogger)

        expect(logSpies.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: error,
                stage: 'embedding',
            }),
            'Document indexing failed',
        )
        expect(mocks.updateDocumentIndexStatus).toHaveBeenCalledWith(
            2,
            DOCUMENT_STATUS.FAILED,
            error.message,
        )
    })
})
