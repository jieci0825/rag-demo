import { describe, expect, it } from 'vitest'

import { transformQueryBodySchema } from '../src/modules/retrieval/retrieval.schema.js'

describe('查询改写请求校验', () => {
    it('保留有效查询的原始内容', () => {
        const result = transformQueryBodySchema.parse({
            query: '  markdown 上传以后是咋拆的  ',
        })

        expect(result.query).toBe('  markdown 上传以后是咋拆的  ')
    })

    it.each([
        '',
        '   ',
        '\n\t',
    ])('拒绝空查询 %#', (query) => {
        expect(() => transformQueryBodySchema.parse({ query })).toThrow()
    })
})
