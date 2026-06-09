import { describe, expect, it } from 'vitest'

import { chunkText } from '../src/rag-core/chunkers/recursive-chunker.js'

describe('递归文本切分', () => {
    it('段落边界不会生成大量重复 chunks', () => {
        const text = `${'A'.repeat(900)}\n\n${'B'.repeat(900)}\n\n${'C'.repeat(900)}`

        const chunks = chunkText(text)

        expect(chunks).toHaveLength(3)
        expect(chunks.map(chunk => chunk.content)).toEqual([
            'A'.repeat(900),
            'B'.repeat(900),
            'C'.repeat(900),
        ])
    })

    it('过长句子会继续使用更细粒度的中文分隔符拆分', () => {
        const chunks = chunkText('甲甲甲，乙乙乙，丙丙丙。', {
            chunkSize: 8,
            chunkOverlap: 0,
        })

        expect(chunks.map(chunk => chunk.content)).toEqual([
            '甲甲甲，乙乙乙，',
            '丙丙丙。',
        ])
        expect(chunks.every(chunk => chunk.charCount <= 8)).toBe(true)
    })

    it('overlap 只复用完整句子片段并保持原文偏移', () => {
        const chunks = chunkText('甲甲甲甲。乙乙乙乙。丙丙丙丙。丁丁丁丁。', {
            chunkSize: 12,
            chunkOverlap: 5,
        })

        expect(chunks).toEqual([
            {
                content: '甲甲甲甲。乙乙乙乙。',
                charCount: 10,
                metadata: { startOffset: 0, endOffset: 10 },
            },
            {
                content: '乙乙乙乙。丙丙丙丙。',
                charCount: 10,
                metadata: { startOffset: 5, endOffset: 15 },
            },
            {
                content: '丙丙丙丙。丁丁丁丁。',
                charCount: 10,
                metadata: { startOffset: 10, endOffset: 20 },
            },
        ])
    })

    it('没有语义分隔符时使用字符级 overlap', () => {
        const chunks = chunkText('ABCDEFGHIJKLMNO', {
            chunkSize: 10,
            chunkOverlap: 3,
        })

        expect(chunks.map(chunk => chunk.content)).toEqual([
            'ABCDEFGHIJ',
            'HIJKLMNO',
        ])
        expect(chunks[1].metadata).toEqual({
            startOffset: 7,
            endOffset: 15,
        })
    })

    it('不会把独立换行生成为空 chunk', () => {
        const chunks = chunkText('甲\n乙', {
            chunkSize: 1,
            chunkOverlap: 0,
        })

        expect(chunks.map(chunk => chunk.content)).toEqual(['甲', '乙'])
    })
})
