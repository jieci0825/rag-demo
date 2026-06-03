const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export interface PaginationInput {
    page?: number
    pageSize?: number
}

export interface Pagination {
    page: number
    pageSize: number
    limit: number
    offset: number
}

/**
 * 将分页参数转换为数据库查询可用的 limit 和 offset。
 */
export function getPagination(input: PaginationInput = {}): Pagination {
    const page = normalizePositiveInteger(input.page, DEFAULT_PAGE)
    const pageSize = Math.min(normalizePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)

    return {
        page,
        pageSize,
        limit: pageSize,
        offset: (page - 1) * pageSize,
    }
}

/**
 * 将输入值规范为正整数。
 */
function normalizePositiveInteger(value: number | undefined, fallback: number): number {
    if (value === undefined || !Number.isFinite(value)) {
        return fallback
    }

    const integerValue = Math.trunc(value)

    return integerValue > 0 ? integerValue : fallback
}
