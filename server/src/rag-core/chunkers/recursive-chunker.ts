const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_CHUNK_OVERLAP = 150

export interface TextChunk {
    content: string
    charCount: number
    metadata: {
        startOffset: number
        endOffset: number
    }
}

export interface ChunkTextOptions {
    chunkSize?: number
    chunkOverlap?: number
}

/**
 * 将文本切成可写入向量库的最小 chunk 列表。
 */
export function chunkText(text: string, options: ChunkTextOptions = {}): TextChunk[] {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
    const chunkOverlap = Math.min(options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP, Math.floor(chunkSize / 2))
    const normalizedText = text.trim()

    if (normalizedText.length === 0) {
        return []
    }

    const chunks: TextChunk[] = []
    let startOffset = 0

    while (startOffset < normalizedText.length) {
        const endOffset = getChunkEndOffset(normalizedText, startOffset, chunkSize)
        const content = normalizedText.slice(startOffset, endOffset).trim()

        if (content.length > 0) {
            chunks.push({
                content,
                charCount: content.length,
                metadata: {
                    startOffset,
                    endOffset,
                },
            })
        }

        if (endOffset >= normalizedText.length) {
            break
        }

        startOffset = Math.max(endOffset - chunkOverlap, startOffset + 1)
    }

    return chunks
}

/**
 * 优先在段落边界结束 chunk，避免把段落从中间截断。
 */
function getChunkEndOffset(text: string, startOffset: number, chunkSize: number): number {
    const maxEndOffset = Math.min(startOffset + chunkSize, text.length)

    if (maxEndOffset >= text.length) {
        return text.length
    }

    const paragraphBreakOffset = text.lastIndexOf('\n\n', maxEndOffset)

    if (paragraphBreakOffset > startOffset) {
        return paragraphBreakOffset
    }

    return maxEndOffset
}
