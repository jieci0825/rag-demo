import { index, integer, jsonb, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'

import { EMBEDDING_DIMENSIONS } from './constants.js'

export const queryLogs = pgTable(
    'query_logs',
    {
        /** 查询日志唯一标识，作为服务端查看历史查询的主键。 */
        id: uuid('id').defaultRandom().primaryKey(),
        /** 用户提交的原始查询文本。 */
        queryText: text('query_text').notNull(),
        /** 查询文本对应的 1024 维 embedding 向量，用于排查召回质量。 */
        queryEmbedding: vector('query_embedding', { dimensions: EMBEDDING_DIMENSIONS }),
        /** 本次查询请求的召回数量。 */
        topK: integer('top_k').notNull(),
        /** 本次查询召回结果快照，记录命中的 chunks 和相关信息。 */
        retrievedChunks: jsonb('retrieved_chunks').$type<unknown[]>(),
        /** 本次查询链路耗时，单位为毫秒。 */
        latencyMs: integer('latency_ms'),
        /** 查询日志创建时间。 */
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    table => [
        index('idx_query_logs_created_at').on(table.createdAt),
    ],
)

export type QueryLog = typeof queryLogs.$inferSelect
export type NewQueryLog = typeof queryLogs.$inferInsert
