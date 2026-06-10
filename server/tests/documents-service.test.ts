import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConflictError } from '../src/lib/errors.js'
import { createContentHash } from '../src/lib/hash.js'
import {
    createFileDocument,
    createTextDocument,
} from '../src/modules/documents/documents.service.js'

const mocks = vi.hoisted(() => ({
    createDocument: vi.fn(),
    existsDocumentByContentHash: vi.fn(),
    indexDocument: vi.fn(),
    loadFile: vi.fn(),
    log: vi.fn(),
    unlink: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
    unlink: mocks.unlink,
}))

vi.mock('../src/modules/documents/documents.repository.js', () => ({
    createDocument: mocks.createDocument,
    existsDocumentByContentHash: mocks.existsDocumentByContentHash,
}))

vi.mock('../src/rag-core/indexer/index-document.js', () => ({
    indexDocument: mocks.indexDocument,
}))

vi.mock('../src/rag-core/loaders/file-loader.js', () => ({
    loadFile: mocks.loadFile,
}))

vi.mock('../src/lib/logger.js', () => ({
    log: mocks.log,
}))

vi.mock('../src/modules/documents/document-upload.js', () => ({
    getDocumentMimeType: vi.fn(() => 'text/plain'),
}))

describe('文档内容去重', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.unlink.mockResolvedValue(undefined)
    })

    it('拒绝创建内容哈希已存在的纯文本文档', async () => {
        const content = 'duplicate content'
        mocks.existsDocumentByContentHash.mockResolvedValue(true)

        await expect(createTextDocument({
            title: '重复文本',
            content,
        })).rejects.toEqual(new ConflictError('Document content already exists'))

        expect(mocks.existsDocumentByContentHash).toHaveBeenCalledWith(
            createContentHash(content),
        )
        expect(mocks.createDocument).not.toHaveBeenCalled()
        expect(mocks.indexDocument).not.toHaveBeenCalled()
    })

    it('拒绝创建内容哈希已存在的文件文档并删除本次上传文件', async () => {
        const content = 'duplicate content'
        const file = {
            filename: 'uploaded.txt',
            originalname: 'duplicate.txt',
            path: '/tmp/uploaded.txt',
        }
        mocks.loadFile.mockResolvedValue(content)
        mocks.existsDocumentByContentHash.mockResolvedValue(true)

        await expect(createFileDocument({}, file))
            .rejects.toEqual(new ConflictError('Document content already exists'))

        expect(mocks.existsDocumentByContentHash).toHaveBeenCalledWith(
            createContentHash(content),
        )
        expect(mocks.createDocument).not.toHaveBeenCalled()
        expect(mocks.unlink).toHaveBeenCalledWith(file.path)
    })
})
