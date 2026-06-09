const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_CHUNK_OVERLAP = 150
const DEFAULT_SEPARATORS = ['\n\n', '\n', '。', '！', '？', '；', '，', '、', '']

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

interface TextPart {
    content: string
    startOffset: number
    endOffset: number
}

/**
 * 按语义分隔符递归拆分文本，再使用完整片段生成带重叠的 chunks。
 */
export function chunkText(text: string, options: ChunkTextOptions = {}): TextChunk[] {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
    const configuredOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP

    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
        throw new RangeError('chunkSize must be a positive integer')
    }

    if (!Number.isInteger(configuredOverlap) || configuredOverlap < 0) {
        throw new RangeError('chunkOverlap must be a non-negative integer')
    }

    const normalizedText = text.trim()

    if (normalizedText.length === 0) {
        return []
    }

    const chunkOverlap = Math.min(configuredOverlap, Math.floor(chunkSize / 2))
    const parts = splitRecursively(normalizedText, 0, DEFAULT_SEPARATORS, chunkSize)

    return mergeParts(normalizedText, parts, chunkSize, chunkOverlap)
}

/**
 * 使用当前可用的最高优先级分隔符拆分文本，并继续处理过长片段。
 */
function splitRecursively(
    text: string,
    startOffset: number,
    separators: readonly string[],
    chunkSize: number,
): TextPart[] {
    if (text.length <= chunkSize) {
        return [{
            content: text,
            startOffset,
            endOffset: startOffset + text.length,
        }]
    }

    let separatorIndex = separators.length - 1

    for (let index = 0; index < separators.length; index += 1) {
        if (separators[index] === '' || text.includes(separators[index])) {
            separatorIndex = index
            break
        }
    }

    const separator = separators[separatorIndex]

    if (separator === '') {
        const parts: TextPart[] = []

        for (let cursor = 0; cursor < text.length; cursor += 1) {
            parts.push({
                content: text[cursor],
                startOffset: startOffset + cursor,
                endOffset: startOffset + cursor + 1,
            })
        }

        return parts
    }

    const parts = splitBySeparator(text, startOffset, separator)
    const remainingSeparators = separators.slice(separatorIndex + 1)
    const result: TextPart[] = []

    for (const part of parts) {
        if (part.content.length <= chunkSize) {
            result.push(part)
            continue
        }

        result.push(...splitRecursively(
            part.content,
            part.startOffset,
            remainingSeparators,
            chunkSize,
        ))
    }

    return result
}

/**
 * 按指定分隔符切分文本，并将分隔符保留在前一个片段末尾。
 */
function splitBySeparator(text: string, startOffset: number, separator: string): TextPart[] {
    const parts: TextPart[] = []
    let cursor = 0

    while (cursor < text.length) {
        const separatorOffset = text.indexOf(separator, cursor)
        const endOffset = separatorOffset === -1
            ? text.length
            : separatorOffset + separator.length
        const content = text.slice(cursor, endOffset)

        parts.push({
            content,
            startOffset: startOffset + cursor,
            endOffset: startOffset + endOffset,
        })
        cursor = endOffset
    }

    return parts
}

/**
 * 按原始顺序合并片段，并将上一 chunk 尾部的完整片段复用于下一 chunk。
 */
function mergeParts(
    sourceText: string,
    parts: TextPart[],
    chunkSize: number,
    chunkOverlap: number,
): TextChunk[] {
    const chunks: TextChunk[] = []
    let currentParts: TextPart[] = []
    let currentLength = 0

    for (const part of parts) {
        if (currentParts.length > 0 && currentLength + part.content.length > chunkSize) {
            const chunk = createChunk(sourceText, currentParts)

            if (chunk.content.length > 0) {
                chunks.push(chunk)
            }

            const availableOverlap = Math.min(
                chunkOverlap,
                chunkSize - part.content.length,
            )
            currentParts = keepCompleteSuffix(currentParts, availableOverlap)
            currentLength = 0

            for (const overlapPart of currentParts) {
                currentLength += overlapPart.content.length
            }
        }

        currentParts.push(part)
        currentLength += part.content.length
    }

    if (currentParts.length > 0) {
        const chunk = createChunk(sourceText, currentParts)

        if (chunk.content.length > 0) {
            chunks.push(chunk)
        }
    }

    return chunks
}

/**
 * 从上一 chunk 尾部保留不超过上限的完整片段。
 */
function keepCompleteSuffix(parts: TextPart[], maxLength: number): TextPart[] {
    let length = 0
    let startIndex = parts.length

    while (startIndex > 0) {
        const partLength = parts[startIndex - 1].content.length

        if (length + partLength > maxLength) {
            break
        }

        length += partLength
        startIndex -= 1
    }

    return parts.slice(startIndex)
}

/**
 * 将连续片段转换为最终 chunk，并让 metadata 指向去除首尾空白后的正文。
 */
function createChunk(sourceText: string, parts: TextPart[]): TextChunk {
    let startOffset = parts[0].startOffset
    let endOffset = parts[parts.length - 1].endOffset

    while (startOffset < endOffset && /\s/.test(sourceText[startOffset])) {
        startOffset += 1
    }

    while (endOffset > startOffset && /\s/.test(sourceText[endOffset - 1])) {
        endOffset -= 1
    }

    const content = sourceText.slice(startOffset, endOffset)

    return {
        content,
        charCount: content.length,
        metadata: {
            startOffset,
            endOffset,
        },
    }
}
