/**
 * 文档来源类型，用于区分纯文本输入和文件上传。
 */
export const DOCUMENT_SOURCE_TYPE = {
    TEXT: 'text',
    FILE: 'file',
} as const

/**
 * 文档 MIME 类型，用于选择对应的内容解析器。
 */
export const DOCUMENT_MIME_TYPE = {
    TEXT: 'text/plain',
    MARKDOWN: 'text/markdown',
} as const

/**
 * 文档索引状态，用于记录文档从待处理到索引完成或失败的状态。
 */
export const DOCUMENT_STATUS = {
    PENDING: 'pending',
    INDEXED: 'indexed',
    FAILED: 'failed',
} as const

export type DocumentSourceType = typeof DOCUMENT_SOURCE_TYPE[keyof typeof DOCUMENT_SOURCE_TYPE]
export type DocumentMimeType = typeof DOCUMENT_MIME_TYPE[keyof typeof DOCUMENT_MIME_TYPE]
export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS]
