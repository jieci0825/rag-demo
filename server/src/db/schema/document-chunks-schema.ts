import { index, integer, jsonb, pgTable, serial, text, uniqueIndex, vector } from 'drizzle-orm/pg-core'

import { EMBEDDING_DIMENSIONS } from './constants.js'
import { timestampWithTimezone } from './timestamp-schema.js'

export const documentChunks = pgTable(
    'document_chunks',
    {
        /** chunk 唯一标识，作为服务端读写切片的主键。 */
        id: serial('id').primaryKey(),
        /** 所属文档 ID，逻辑关联 documents.id，不创建数据库外键。 */
        documentId: integer('document_id').notNull(),
        /** 当前 chunk 在所属文档内的顺序，从 0 开始递增。 */
        chunkIndex: integer('chunk_index').notNull(),
        /** chunk 原始文本内容，用于召回后组装上下文。 */
        content: text('content').notNull(),
        /** 标题路径和正文组成的检索文本，供关键词检索使用。 */
        searchText: text('search_text').notNull(),
        /** chunk 文本对应的 1024 维 embedding 向量，用于 pgvector 相似度检索。 */
        embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
        /** chunk 的 token 数量，无法统计时为空。 */
        tokenCount: integer('token_count'),
        /** chunk 的字符数量，无法统计时为空。 */
        charCount: integer('char_count'),
        /** chunk 级扩展元数据，保留切分位置等非固定字段。 */
        metadata: jsonb('metadata').$type<Record<string, unknown>>(),
        /** chunk 记录创建时间。 */
        createdAt: timestampWithTimezone('created_at').defaultNow().notNull(),
    },
    table => [
        index('idx_document_chunks_document_id').on(table.documentId),
        index('idx_document_chunks_search_text_trgm').using(
            'gin',
            table.searchText.op('gin_trgm_ops'),
        ),
        uniqueIndex('uniq_document_chunks_document_id_chunk_index').on(table.documentId, table.chunkIndex),
    ],
)

export type DocumentChunk = typeof documentChunks.$inferSelect
export type NewDocumentChunk = typeof documentChunks.$inferInsert
