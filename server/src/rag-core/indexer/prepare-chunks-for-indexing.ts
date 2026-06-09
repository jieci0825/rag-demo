import { createContentHash } from '../../lib/hash.js'

import type { StructuredChunk } from '../chunkers/index.js'

const PAGE_NUMBER_PATTERNS = [
    /^第\s*\d+\s*页\s*(?:[/／]\s*)?共\s*\d+\s*页$/,
    /^\d+\s*[/／]\s*\d+$/,
    /^Page\s+\d+\s+of\s+\d+$/i,
]

/**
 * 清洗 chunks、过滤空内容，并在单个文档内按清洗后的内容去重。
 */
export function prepareChunksForIndexing(chunks: StructuredChunk[]): StructuredChunk[] {
    const preparedChunks: StructuredChunk[] = []
    const contentHashes = new Set<string>()

    for (const chunk of chunks) {
        const content = cleanChunkContent(chunk.content)

        if (content.length === 0) {
            continue
        }

        const contentHash = createContentHash(content)

        if (contentHashes.has(contentHash)) {
            continue
        }

        contentHashes.add(contentHash)
        preparedChunks.push({
            ...chunk,
            content,
            charCount: content.length,
        })
    }

    return preparedChunks
}

/**
 * 清理 chunk 中的页码和多余空白，同时保留正文中的单个换行。
 */
function cleanChunkContent(content: string): string {
    const normalizedContent = content.replace(/\r\n?/g, '\n')
    const cleanedLines: string[] = []

    for (const sourceLine of normalizedContent.split('\n')) {
        const line = sourceLine.trim().replace(/\s+/g, ' ')

        if (isPageNumberLine(line)) {
            continue
        }

        cleanedLines.push(line)
    }

    return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 判断当前独立行是否为需要移除的页码。
 */
function isPageNumberLine(line: string): boolean {
    for (const pattern of PAGE_NUMBER_PATTERNS) {
        if (pattern.test(line)) {
            return true
        }
    }

    return false
}
