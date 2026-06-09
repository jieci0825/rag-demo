import { loadText } from '../loaders/text-loader.js'

import type { ParsedDocument } from './parsed-document.js'

/**
 * 将纯文本转换为不推断标题的统一文档结构。
 */
export function parseTextDocument(source: string): ParsedDocument {
    const content = loadText(source)

    if (content.length === 0) {
        return { blocks: [] }
    }

    return {
        blocks: [{
            type: 'paragraph',
            content,
            metadata: {
                startOffset: 0,
            },
        }],
    }
}
