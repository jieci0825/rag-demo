import { count, desc, eq } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { queryLogs } from '../../db/schema.js'

import type { NewQueryLog, QueryLog } from '../../db/schema.js'

const queryLogListFields = {
    id: queryLogs.id,
    queryText: queryLogs.queryText,
    queryTransforms: queryLogs.queryTransforms,
    topK: queryLogs.topK,
    latencyMs: queryLogs.latencyMs,
    createdAt: queryLogs.createdAt,
}

const queryLogDetailFields = {
    ...queryLogListFields,
    retrievedChunks: queryLogs.retrievedChunks,
}

export type QueryLogListItem = Pick<
    QueryLog,
    'id' | 'queryText' | 'queryTransforms' | 'topK' | 'latencyMs' | 'createdAt'
>

export type QueryLogDetail = QueryLogListItem & Pick<QueryLog, 'retrievedChunks'>

/**
 * 创建查询链路日志。
 */
export async function createQueryLog(input: NewQueryLog): Promise<void> {
    await db.insert(queryLogs).values(input)
}

/**
 * 按创建时间倒序分页查询日志，并返回总数。
 */
export async function findQueryLogs(
    limit: number,
    offset: number,
): Promise<{ total: number, list: QueryLogListItem[] }> {
    const [totalResult, list] = await Promise.all([
        db.select({ value: count() }).from(queryLogs),
        db
            .select(queryLogListFields)
            .from(queryLogs)
            .orderBy(desc(queryLogs.createdAt), desc(queryLogs.id))
            .limit(limit)
            .offset(offset),
    ])

    return {
        total: totalResult[0]?.value ?? 0,
        list,
    }
}

/**
 * 按 ID 查询单条日志详情。
 */
export async function findQueryLogById(id: number): Promise<QueryLogDetail | undefined> {
    const [queryLog] = await db
        .select(queryLogDetailFields)
        .from(queryLogs)
        .where(eq(queryLogs.id, id))
        .limit(1)

    return queryLog
}
