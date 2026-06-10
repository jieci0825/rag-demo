import { describe, expect, it } from 'vitest'

import {
    queryTransformOutputSchema,
    transformQueryBodySchema,
} from '../src/modules/retrieval/retrieval.schema.js'

describe('查询转换请求校验', () => {
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

describe('查询转换输出校验', () => {
    it.each([
        {
            strategy: 'none',
            queries: ['退款流程'],
        },
        {
            strategy: 'rewrite',
            queries: ['昨天购买的商品如何申请退款？'],
        },
        {
            strategy: 'expand',
            queries: ['退款流程 退款申请步骤 售后退款'],
        },
        {
            strategy: 'multi_query',
            queries: ['如何申请退款？', '退款申请流程是什么？'],
        },
        {
            strategy: 'decomposition',
            queries: ['退款需要满足什么条件？', '退款多久可以到账？'],
        },
    ])('接受 $strategy 策略的有效输出', (output) => {
        expect(queryTransformOutputSchema.parse(output)).toEqual(output)
    })

    it.each([
        {
            strategy: 'none',
            queries: ['查询一', '查询二'],
        },
        {
            strategy: 'rewrite',
            queries: [],
        },
        {
            strategy: 'expand',
            queries: ['查询一', '查询二', '查询三', '查询四'],
        },
        {
            strategy: 'multi_query',
            queries: ['查询一'],
        },
        {
            strategy: 'decomposition',
            queries: ['查询一'],
        },
    ])('拒绝 $strategy 策略的非法查询数量', (output) => {
        expect(() => queryTransformOutputSchema.parse(output)).toThrow()
    })
})
