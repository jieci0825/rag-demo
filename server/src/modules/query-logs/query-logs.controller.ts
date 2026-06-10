import { SuccessException } from '../../lib/errors.js'
import {
    getQueryLogDetail,
    getQueryLogs,
} from './query-logs.service.js'

import type { Context } from 'koa'
import type {
    QueryLogParams,
    QueryLogsListQuery,
} from './query-logs.schema.js'

/**
 * 处理查询日志分页列表请求。
 */
export async function getQueryLogsController(ctx: Context): Promise<void> {
    const query = ctx.state.validated.query as QueryLogsListQuery
    const result = await getQueryLogs(query)

    throw new SuccessException(result)
}

/**
 * 处理查询日志详情请求。
 */
export async function getQueryLogDetailController(ctx: Context): Promise<void> {
    const params = ctx.state.validated.params as QueryLogParams
    const result = await getQueryLogDetail(params.id)

    throw new SuccessException(result)
}
