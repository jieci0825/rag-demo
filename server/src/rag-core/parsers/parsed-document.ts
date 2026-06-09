export type DocumentBlockType = 'heading' | 'paragraph' | 'list' | 'code'

export interface ParsedDocument {
    title?: string
    blocks: DocumentBlock[]
}

export interface DocumentBlock {
    type: DocumentBlockType
    content: string
    level?: number
    metadata?: Record<string, unknown>
}
