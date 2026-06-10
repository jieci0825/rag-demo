import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DrizzleQueryError } from 'drizzle-orm'

import { ERROR_DEFINITIONS } from '../src/constants/error-definitions.js'
import { AppError } from '../src/lib/errors.js'
import { createDocument } from '../src/modules/documents/documents.repository.js'

const mocks = vi.hoisted(() => ({
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
}))

vi.mock('../src/db/index.js', () => ({
    db: {
        insert: mocks.insert,
    },
}))

describe('文档仓储内容去重', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.insert.mockReturnValue({ values: mocks.values })
        mocks.values.mockReturnValue({ returning: mocks.returning })
    })

    it('将内容哈希唯一索引冲突转换为 409 业务错误', async () => {
        const databaseError = Object.assign(new Error('duplicate key'), {
            code: '23505',
            constraint: 'uniq_documents_content_hash',
        })
        mocks.returning.mockRejectedValue(
            new DrizzleQueryError('insert into documents', [], databaseError),
        )

        await expect(createDocument({
            title: '并发重复文档',
            sourceType: 'text',
            contentHash: createContentHashFixture(),
            status: 'pending',
        })).rejects.toEqual(
            new AppError(ERROR_DEFINITIONS.DOCUMENT_CONTENT_ALREADY_EXISTS),
        )
    })
})

/**
 * 返回测试使用的固定 SHA-256 内容哈希。
 */
function createContentHashFixture(): string {
    return 'a'.repeat(64)
}
