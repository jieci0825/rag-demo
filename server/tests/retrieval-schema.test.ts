import { describe, expect, it } from 'vitest'

import { transformQueryBodySchema } from '../src/modules/retrieval/retrieval.schema.js'

describe('查询改写请求校验', () => {
    it('保留有效查询的原始内容', () => {
        const result = transformQueryBodySchema.parse({
            query: '  markdown 上传以后是咋拆的  ',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        })

        expect(result.query).toBe('  markdown 上传以后是咋拆的  ')
        expect(result.provider).toBe('deepseek')
        expect(result.model).toBe('deepseek-v4-flash')
    })

    it.each([
        '',
        '   ',
        '\n\t',
    ])('拒绝空查询 %#', (query) => {
        expect(() => transformQueryBodySchema.parse({
            query,
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
        })).toThrow()
    })

    it('拒绝不支持的模型提供商', () => {
        expect(() => transformQueryBodySchema.parse({
            query: '有效查询',
            provider: 'unknown',
            model: 'custom-model',
        })).toThrow()
    })

    it('拒绝空模型名称', () => {
        expect(() => transformQueryBodySchema.parse({
            query: '有效查询',
            provider: 'deepseek',
            model: '',
        })).toThrow()
    })
})
