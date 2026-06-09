import { describe, expect, it } from 'vitest'

import {
    formatBeijingDateTime,
    formatResponseDateTimes,
} from '../src/lib/time.js'

describe('北京时间格式化', () => {
    it('将 UTC 时间转换为标准北京时间', () => {
        const date = new Date('2026-06-09T04:19:55.305Z')

        expect(formatBeijingDateTime(date)).toBe('2026-06-09 12:19:55')
    })

    it('正确处理北京时间跨天', () => {
        const date = new Date('2026-06-09T18:30:00.000Z')

        expect(formatBeijingDateTime(date)).toBe('2026-06-10 02:30:00')
    })

    it('递归格式化响应对象和数组中的时间', () => {
        const createdAt = new Date('2026-06-09T04:19:55.305Z')
        const response = {
            createdAt,
            nested: {
                indexedAt: createdAt,
            },
            items: [createdAt, null],
        }

        expect(formatResponseDateTimes(response)).toEqual({
            createdAt: '2026-06-09 12:19:55',
            nested: {
                indexedAt: '2026-06-09 12:19:55',
            },
            items: ['2026-06-09 12:19:55', null],
        })
    })
})
