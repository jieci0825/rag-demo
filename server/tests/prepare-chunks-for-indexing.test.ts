import { describe, expect, it } from 'vitest'

import { prepareChunksForIndexing } from '../src/rag-core/indexer/prepare-chunks-for-indexing.js'

import type { StructuredChunk } from '../src/rag-core/chunkers/index.js'

describe('索引前 chunk 治理', () => {
    it('清理多余空白并保留单个换行和单个空行', () => {
        const chunks = prepareChunksForIndexing([
            createChunk('  第一行   内容  \r\n  第二行  \n\n\n  第三行  '),
        ])

        expect(chunks[0].content).toBe('第一行 内容\n第二行\n\n第三行')
        expect(chunks[0].charCount).toBe(chunks[0].content.length)
    })

    it.each([
        '第 1 页 / 共 10 页',
        '第1页 共10页',
        '1 / 10',
        '1/10',
        'Page 1 of 10',
    ])('移除独立页码行：%s', (pageNumber) => {
        const chunks = prepareChunksForIndexing([
            createChunk(`正文第一行\n${pageNumber}\n正文第二行`),
        ])

        expect(chunks[0].content).toBe('正文第一行\n正文第二行')
    })

    it('不会删除正文中的页码文本', () => {
        const chunks = prepareChunksForIndexing([
            createChunk('详情请参阅第 1 页 / 共 10 页中的说明。'),
        ])

        expect(chunks[0].content).toBe('详情请参阅第 1 页 / 共 10 页中的说明。')
    })

    it('过滤清洗后为空的 chunk', () => {
        const chunks = prepareChunksForIndexing([
            createChunk(' \n\n '),
            createChunk('第 1 页 / 共 10 页'),
            createChunk('有效正文'),
        ])

        expect(chunks).toEqual([createChunk('有效正文')])
    })

    it('按清洗后的内容哈希去重并保留第一次出现的 chunk', () => {
        const firstChunk = createChunk('重复   内容', ['第一章'])
        const duplicateChunk = createChunk('  重复 内容  ', ['第二章'])
        const uniqueChunk = createChunk('其他内容', ['第三章'])

        const chunks = prepareChunksForIndexing([
            firstChunk,
            duplicateChunk,
            uniqueChunk,
        ])

        expect(chunks).toEqual([
            {
                ...firstChunk,
                content: '重复 内容',
                charCount: 5,
            },
            uniqueChunk,
        ])
    })
})

/**
 * 创建测试使用的结构化 chunk。
 */
function createChunk(content: string, headingPath: string[] = []): StructuredChunk {
    return {
        content,
        charCount: content.length,
        metadata: { headingPath },
    }
}
