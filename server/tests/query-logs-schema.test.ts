import { describe, expect, it } from 'vitest'

import {
    queryLogParamsSchema,
    queryLogsListQuerySchema,
} from '../src/modules/query-logs/query-logs.schema.js'

describe('查询日志接口参数校验', () => {
    it('将列表分页参数转换为正整数', () => {
        expect(queryLogsListQuerySchema.parse({
            page: '2',
            pageSize: '50',
        })).toEqual({
            page: 2,
            pageSize: 50,
        })
    })

    it('允许列表使用默认分页参数', () => {
        expect(queryLogsListQuerySchema.parse({})).toEqual({})
    })

    it('拒绝非法分页参数', () => {
        expect(() => queryLogsListQuerySchema.parse({
            page: '0',
        })).toThrow()
    })

    it('将详情 ID 转换为正整数', () => {
        expect(queryLogParamsSchema.parse({
            id: '12',
        })).toEqual({
            id: 12,
        })
    })
})
