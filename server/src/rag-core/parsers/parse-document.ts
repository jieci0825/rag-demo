import { DOCUMENT_MIME_TYPE } from '../../constants/document-constants.js'
import { parseMarkdownDocument } from './markdown-parser.js'
import { parseTextDocument } from './text-parser.js'

import type { DocumentMimeType } from '../../constants/document-constants.js'
import type { ParsedDocument } from './parsed-document.js'

export type SupportedDocumentMimeType = DocumentMimeType

/**
 * 根据受支持的 MIME 类型选择对应格式解析器。
 */
export function parseDocument(
    source: string,
    mimeType: SupportedDocumentMimeType,
): ParsedDocument {
    if (mimeType === DOCUMENT_MIME_TYPE.MARKDOWN) {
        return parseMarkdownDocument(source)
    }

    return parseTextDocument(source)
}
