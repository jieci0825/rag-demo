import { chunkText } from './recursive-chunker.js'

import type { ChunkTextOptions } from './recursive-chunker.js'
import type { DocumentBlock, ParsedDocument } from '../parsers/index.js'

export interface StructuredChunk {
    content: string
    charCount: number
    metadata: {
        headingPath: string[]
        startOffset?: number
        endOffset?: number
    }
}

interface HeadingEntry {
    level: number
    content: string
}

/**
 * 按标题边界组织章节，并在章节内部沿用递归文本切分。
 */
export function chunkDocument(
    document: ParsedDocument,
    options: ChunkTextOptions = {},
): StructuredChunk[] {
    const chunks: StructuredChunk[] = []
    const headings: HeadingEntry[] = []
    let sectionBlocks: DocumentBlock[] = []

    /**
     * 将当前章节正文切分后写入结果，并保留对应标题路径。
     */
    const flushSection = (): void => {
        if (sectionBlocks.length === 0) {
            return
        }

        const headingPath = headings.map(heading => heading.content)
        chunks.push(...chunkSection(sectionBlocks, headingPath, options))
        sectionBlocks = []
    }

    for (const block of document.blocks) {
        if (block.type !== 'heading') {
            sectionBlocks.push(block)
            continue
        }

        flushSection()
        updateHeadingPath(headings, block)
    }

    flushSection()

    return chunks
}

/**
 * 将同一章节的内容块合并后递归切分。
 */
function chunkSection(
    blocks: DocumentBlock[],
    headingPath: string[],
    options: ChunkTextOptions,
): StructuredChunk[] {
    const content = blocks.map(block => block.content).join('\n\n')
    const textChunks = chunkText(content, options)
    const sourceOffset = getSingleBlockStartOffset(blocks)

    return textChunks.map((chunk) => ({
        content: chunk.content,
        charCount: chunk.charCount,
        metadata: {
            headingPath: [...headingPath],
            ...(sourceOffset === undefined
                ? {}
                : {
                    startOffset: sourceOffset + chunk.metadata.startOffset,
                    endOffset: sourceOffset + chunk.metadata.endOffset,
                }),
        },
    }))
}

/**
 * 更新当前标题层级，并移除已经结束的同级和下级标题。
 */
function updateHeadingPath(headings: HeadingEntry[], heading: DocumentBlock): void {
    const level = heading.level ?? 1

    while (headings.length > 0 && headings[headings.length - 1].level >= level) {
        headings.pop()
    }

    headings.push({
        level,
        content: heading.content,
    })
}

/**
 * 单块章节存在来源偏移时返回其起点，供纯文本保留原有定位信息。
 */
function getSingleBlockStartOffset(blocks: DocumentBlock[]): number | undefined {
    if (blocks.length !== 1) {
        return undefined
    }

    const startOffset = blocks[0].metadata?.startOffset

    return typeof startOffset === 'number' ? startOffset : undefined
}
