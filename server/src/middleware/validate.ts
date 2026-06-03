import { ValidationError } from '../lib/errors.js'

import type { Middleware } from 'koa'
import type { ZodType } from 'zod'

export interface RequestValidationSchemas {
    body?: ZodType
    params?: ZodType
    query?: ZodType
}

/**
 * 按需校验请求 body、params、query，并将校验结果写回 ctx.state。
 */
export function validateRequest(schemas: RequestValidationSchemas): Middleware {
    return async (ctx, next) => {
        const validated: Record<string, unknown> = {}

        if (schemas.body) {
            validated.body = parseRequestPart(schemas.body, ctx.request.body)
        }

        if (schemas.query) {
            validated.query = parseRequestPart(schemas.query, ctx.query)
        }

        if (schemas.params) {
            validated.params = parseRequestPart(schemas.params, getRouteParams(ctx))
        }

        ctx.state.validated = validated

        await next()
    }
}

/**
 * 使用 Zod schema 校验单个请求片段。
 */
function parseRequestPart(schema: ZodType, value: unknown): unknown {
    const result = schema.safeParse(value)

    if (!result.success) {
        throw new ValidationError(result.error.flatten())
    }

    return result.data
}

/**
 * 读取 Koa Router 注入的路由参数。
 */
function getRouteParams(ctx: object): unknown {
    return 'params' in ctx ? ctx.params : {}
}
