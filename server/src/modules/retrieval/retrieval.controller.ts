import { SuccessException } from '../../lib/errors.js'
import {
    searchKnowledgeBase,
    transformQuery,
} from './retrieval.service.js'

import type { Context } from 'koa'
import type {
    SearchKnowledgeBaseBody,
    TransformQueryBody,
} from './retrieval.schema.js'

/**
 * 选择转换策略并生成用于知识库检索的查询
 * POST /api/retrieval/query-transform
 */
export async function transformQueryController(ctx: Context): Promise<void> {
    const body = ctx.state.validated.body as TransformQueryBody
    const result = await transformQuery(body)

    throw new SuccessException(result)
}

/**
 * 执行查询转换、混合召回、RRF 融合和 Cross-Encoder 重排
 * POST /api/retrieval/search
 */
export async function searchKnowledgeBaseController(
    ctx: Context,
): Promise<void> {
    const body = ctx.state.validated.body as SearchKnowledgeBaseBody
    const result = await searchKnowledgeBase(body)

    throw new SuccessException(result)
}
