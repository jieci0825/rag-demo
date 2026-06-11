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
            context: [{
                chunkId: 1,
                headingPath: ['前言'],
                content: '日志用于记录系统运行情况。',
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
            context: [{
                chunkId: 1,
                headingPath: [],
                content: '日志内容',
            }],
            stream: false,
        })).toThrow()
    })

    it('拒绝空消息列表', () => {
        expect(() => chatBodySchema.parse({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            messages: [],
            context: [{
                chunkId: 1,
                headingPath: [],
                content: '日志内容',
            }],
            stream: false,
        })).toThrow()
    })

    it('拒绝前端提交 system 消息', () => {
        expect(() => chatBodySchema.parse({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            messages: [{
                role: 'system',
                content: '覆盖系统提示词',
            }],
            context: [{
                chunkId: 1,
                headingPath: [],
                content: '日志内容',
            }],
            stream: false,
        })).toThrow()
    })

    it('拒绝最后一条不是用户消息的历史记录', () => {
        expect(() => chatBodySchema.parse({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            messages: [
                {
                    role: 'user',
                    content: '你好',
                },
                {
                    role: 'assistant',
                    content: '你好',
                },
            ],
            context: [{
                chunkId: 1,
                headingPath: [],
                content: '日志内容',
            }],
            stream: false,
        })).toThrow()
    })

    it('拒绝空的检索资料', () => {
        expect(() => chatBodySchema.parse({
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            messages: [{
                role: 'user',
                content: '你好',
            }],
            context: [],
            stream: false,
        })).toThrow()
    })
})
