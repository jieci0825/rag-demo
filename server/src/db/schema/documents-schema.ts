import { index, jsonb, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const documents = pgTable(
    'documents',
    {
        /** 文档唯一标识，作为服务端读写文档的主键。 */
        id: serial('id').primaryKey(),
        /** 文档标题，用于列表展示和检索结果引用。 */
        title: text('title').notNull(),
        /** 文档来源类型，第一版用于区分 text、file、url 等输入来源。 */
        sourceType: varchar('source_type', { length: 50 }).notNull(),
        /** 原始来源地址，可以是本地文件路径、URL，纯文本输入可为空。 */
        sourceUri: text('source_uri'),
        /** 文档 MIME 类型，用于记录文件类型或后续 loader 判断。 */
        mimeType: varchar('mime_type', { length: 100 }),
        /** 文档内容 hash，用于同内容文档的去重判断。 */
        contentHash: varchar('content_hash', { length: 128 }),
        /** 文档级扩展元数据，保留来源、解析参数等非固定字段。 */
        metadata: jsonb('metadata').$type<Record<string, unknown>>(),
        /** 文档索引状态，当前仅使用 pending、indexed、failed。 */
        status: varchar('status', { length: 30 }).notNull(),
        /** 索引失败时的错误信息，成功或未处理时为空。 */
        errorMessage: text('error_message'),
        /** 文档完成索引的时间，未完成索引时为空。 */
        indexedAt: timestamp('indexed_at', { withTimezone: true }),
        /** 文档记录创建时间。 */
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        /** 文档记录最后更新时间。 */
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    table => [
        index('idx_documents_status').on(table.status),
        index('idx_documents_content_hash').on(table.contentHash),
    ],
)

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
