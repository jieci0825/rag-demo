import { describe, expect, it } from 'vitest'

import { chatBodySchema } from '../src/modules/chat/chat-schema.js'

describe('聊天请求校验', () => {
    it.each([true, false])('接受 stream=%s 的有效请求', (stream) => {
        const result = chatBodySchema.parse({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream,
        })

        expect(result.stream).toBe(stream)
    })

    it('拒绝不支持的模型提供商', () => {
        expect(() => chatBodySchema.parse({
            provider: 'unknown',
            model: 'custom-model',
            messages: [{
                role: 'user',
                content: '你好',
            }],
            stream: false,
        })).toThrow()
    })

    it('拒绝空消息列表', () => {
        expect(() => chatBodySchema.parse({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            messages: [],
            stream: false,
        })).toThrow()
    })
})
