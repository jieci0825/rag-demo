/**
 * 获取当前时间。
 */
export function getNow(): Date {
    return new Date()
}

/**
 * 将时间转换为 ISO 字符串。
 */
export function toIsoString(date: Date): string {
    return date.toISOString()
}
