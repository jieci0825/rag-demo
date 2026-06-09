import { timestamp } from 'drizzle-orm/pg-core'

/**
 * 创建统一保留时区信息的数据库时间字段。
 */
export function timestampWithTimezone<TName extends string>(name: TName) {
    return timestamp(name, { withTimezone: true })
}
