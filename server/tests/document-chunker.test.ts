import { describe, expect, it } from 'vitest'

import { chunkDocument } from '../src/rag-core/chunkers/index.js'
import { buildEmbeddingText } from '../src/rag-core/indexer/build-embedding-text.js'
import { parseMarkdownDocument, parseTextDocument } from '../src/rag-core/parsers/index.js'

describe('统一文档切分', () => {
    it('按标题边界切分并保存完整标题路径', () => {
        const document = parseMarkdownDocument([
            '# 海水缸维护',
            '',
            '概览。',
            '',
            '## 水质检测',
            '',
            '检测氨和硝酸盐。',
            '',
            '### 基础指标',
            '',
            '记录盐度。',
            '',
            '## 换水',
            '',
            '每周换水。',
        ].join('\n'))

        expect(chunkDocument(document)).toEqual([
            {
                content: '概览。',
                charCount: 3,
                metadata: { headingPath: ['海水缸维护'] },
            },
            {
                content: '检测氨和硝酸盐。',
                charCount: 8,
                metadata: { headingPath: ['海水缸维护', '水质检测'] },
            },
            {
                content: '记录盐度。',
                charCount: 5,
                metadata: { headingPath: ['海水缸维护', '水质检测', '基础指标'] },
            },
            {
                content: '每周换水。',
                charCount: 5,
                metadata: { headingPath: ['海水缸维护', '换水'] },
            },
        ])
    })

    it('纯文本继续使用递归切分并保留偏移', () => {
        const document = parseTextDocument('甲甲甲。乙乙乙。丙丙丙。')
        const chunks = chunkDocument(document, {
            chunkSize: 8,
            chunkOverlap: 0,
        })

        expect(chunks).toEqual([
            {
                content: '甲甲甲。乙乙乙。',
                charCount: 8,
                metadata: {
                    headingPath: [],
                    startOffset: 0,
                    endOffset: 8,
                },
            },
            {
                content: '丙丙丙。',
                charCount: 4,
                metadata: {
                    headingPath: [],
                    startOffset: 8,
                    endOffset: 12,
                },
            },
        ])
    })

    it('标题层级跳跃时不会生成空标题路径', () => {
        const document = parseMarkdownDocument([
            '# 一级标题',
            '### 三级标题',
            '正文。',
        ].join('\n'))

        expect(chunkDocument(document)[0].metadata.headingPath).toEqual([
            '一级标题',
            '三级标题',
        ])
    })

    it('Embedding 输入包含标题路径但不修改原始正文', () => {
        const [chunk] = chunkDocument(parseMarkdownDocument([
            '# 海水缸维护',
            '## 水质检测',
            '定期检测氨和硝酸盐。',
        ].join('\n')))

        expect(chunk.content).toBe('定期检测氨和硝酸盐。')
        expect(buildEmbeddingText(chunk)).toBe([
            '海水缸维护',
            '水质检测',
            '',
            '定期检测氨和硝酸盐。',
        ].join('\n'))
    })
})
