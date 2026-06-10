import { NotFoundError } from '../../lib/errors.js'
import { getPagination } from '../../lib/pagination.js'
import {
    findQueryLogById,
    findQueryLogs,
} from './query-logs.repository.js'

import type { QueryLogDetail, QueryLogListItem } from './query-logs.repository.js'
import type { QueryLogsListQuery } from './query-logs.schema.js'

export interface QueryLogsListResult {
    total: number
    list: QueryLogListItem[]
}

/**
 * 分页查询日志列表。
 */
export async function getQueryLogs(
    input: QueryLogsListQuery,
): Promise<QueryLogsListResult> {
    const pagination = getPagination(input)

    return findQueryLogs(pagination.limit, pagination.offset)
}

/**
 * 查询单条日志详情，不存在时返回 404。
 */
export async function getQueryLogDetail(id: number): Promise<QueryLogDetail> {
    const queryLog = await findQueryLogById(id)

    if (!queryLog) {
        throw new NotFoundError('Query log not found')
    }

    return queryLog
}
