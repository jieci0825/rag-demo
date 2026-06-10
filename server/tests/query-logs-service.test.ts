import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ERROR_DEFINITIONS } from '../src/constants/error-definitions.js'
import { AppError } from '../src/lib/errors.js'
import {
    getQueryLogDetail,
    getQueryLogs,
} from '../src/modules/query-logs/query-logs.service.js'

const mocks = vi.hoisted(() => ({
    findQueryLogById: vi.fn(),
    findQueryLogs: vi.fn(),
}))

vi.mock('../src/modules/query-logs/query-logs.repository.js', () => ({
    findQueryLogById: mocks.findQueryLogById,
    findQueryLogs: mocks.findQueryLogs,
}))

describe('查询日志服务', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('使用统一分页规则查询列表', async () => {
        const result = {
            total: 0,
            list: [],
        }

        mocks.findQueryLogs.mockResolvedValue(result)

        await expect(getQueryLogs({
            page: 3,
            pageSize: 10,
        })).resolves.toEqual(result)

        expect(mocks.findQueryLogs).toHaveBeenCalledWith(10, 20)
    })

    it('未传分页参数时使用默认值', async () => {
        mocks.findQueryLogs.mockResolvedValue({
            total: 0,
            list: [],
        })

        await getQueryLogs({})

        expect(mocks.findQueryLogs).toHaveBeenCalledWith(20, 0)
    })

    it('返回存在的查询日志详情', async () => {
        const detail = {
            id: 1,
            queryText: '原查询',
            queryTransforms: null,
            topK: null,
            retrievedChunks: null,
            latencyMs: 20,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
        }

        mocks.findQueryLogById.mockResolvedValue(detail)

        await expect(getQueryLogDetail(1)).resolves.toEqual(detail)
    })

    it('查询日志不存在时返回 404', async () => {
        mocks.findQueryLogById.mockResolvedValue(undefined)

        await expect(getQueryLogDetail(999))
            .rejects.toEqual(
                new AppError(ERROR_DEFINITIONS.QUERY_LOG_NOT_FOUND),
            )
    })
})
