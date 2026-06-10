import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryLogs } from '../src/db/schema.js'
import {
    createQueryLog,
    findQueryLogById,
    findQueryLogs,
} from '../src/modules/query-logs/query-logs.repository.js'

const mocks = vi.hoisted(() => ({
    detailFrom: vi.fn(),
    detailLimit: vi.fn(),
    detailWhere: vi.fn(),
    insert: vi.fn(),
    listFrom: vi.fn(),
    listLimit: vi.fn(),
    listOffset: vi.fn(),
    listOrderBy: vi.fn(),
    select: vi.fn(),
    totalFrom: vi.fn(),
    values: vi.fn(),
}))

vi.mock('../src/db/index.js', () => ({
    db: {
        insert: mocks.insert,
        select: mocks.select,
    },
}))

describe('查询日志仓储', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.insert.mockReturnValue({
            values: mocks.values,
        })
        mocks.values.mockResolvedValue(undefined)
        mocks.select.mockImplementation((fields: Record<string, unknown>) => {
            if ('value' in fields) {
                return {
                    from: mocks.totalFrom,
                }
            }

            if ('retrievedChunks' in fields) {
                return {
                    from: mocks.detailFrom,
                }
            }

            return {
                from: mocks.listFrom,
            }
        })
        mocks.totalFrom.mockResolvedValue([{ value: 2 }])
        mocks.listFrom.mockReturnValue({
            orderBy: mocks.listOrderBy,
        })
        mocks.listOrderBy.mockReturnValue({
            limit: mocks.listLimit,
        })
        mocks.listLimit.mockReturnValue({
            offset: mocks.listOffset,
        })
        mocks.detailFrom.mockReturnValue({
            where: mocks.detailWhere,
        })
        mocks.detailWhere.mockReturnValue({
            limit: mocks.detailLimit,
        })
    })

    it('写入查询改写阶段日志', async () => {
        const input = {
            queryText: '原查询',
            queryTransforms: {
                rewrite: {
                    query: '标准查询',
                },
            },
            queryEmbedding: null,
            topK: null,
            retrievedChunks: null,
            latencyMs: 25,
        }

        await createQueryLog(input)

        expect(mocks.insert).toHaveBeenCalledWith(queryLogs)
        expect(mocks.values).toHaveBeenCalledWith(input)
    })

    it('分页查询列表时排除 embedding 和检索结果', async () => {
        const list = [{
            id: 2,
            queryText: '原查询',
            queryTransforms: null,
            topK: null,
            latencyMs: 25,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
        }]

        mocks.listOffset.mockResolvedValue(list)

        await expect(findQueryLogs(20, 40)).resolves.toEqual({
            total: 2,
            list,
        })

        const listFields = mocks.select.mock.calls.find(
            ([fields]) => 'id' in fields && !('retrievedChunks' in fields),
        )?.[0] as Record<string, unknown>

        expect(listFields).not.toHaveProperty('queryEmbedding')
        expect(listFields).not.toHaveProperty('retrievedChunks')
        expect(mocks.listLimit).toHaveBeenCalledWith(20)
        expect(mocks.listOffset).toHaveBeenCalledWith(40)
    })

    it('查询详情时包含检索结果并排除 embedding', async () => {
        const detail = {
            id: 1,
            queryText: '原查询',
            queryTransforms: null,
            topK: 5,
            retrievedChunks: [{ id: 10 }],
            latencyMs: 30,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
        }

        mocks.detailLimit.mockResolvedValue([detail])

        await expect(findQueryLogById(1)).resolves.toEqual(detail)

        const detailFields = mocks.select.mock.calls.find(
            ([fields]) => 'retrievedChunks' in fields,
        )?.[0] as Record<string, unknown>

        expect(detailFields).toHaveProperty('retrievedChunks')
        expect(detailFields).not.toHaveProperty('queryEmbedding')
        expect(mocks.detailLimit).toHaveBeenCalledWith(1)
    })

    it('查询不存在的详情时返回 undefined', async () => {
        mocks.detailLimit.mockResolvedValue([])

        await expect(findQueryLogById(999)).resolves.toBeUndefined()
    })
})
