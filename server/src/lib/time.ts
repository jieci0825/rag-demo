const BEIJING_TIME_ZONE = 'Asia/Shanghai'
const BEIJING_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
})

/**
 * 获取当前时间。
 */
export function getNow(): Date {
    return new Date()
}

/**
 * 将时间格式化为 YYYY-MM-DD HH:mm:ss 的北京时间。
 */
export function formatBeijingDateTime(date: Date): string {
    const parts = Object.fromEntries(
        BEIJING_DATE_TIME_FORMATTER
            .formatToParts(date)
            .map(part => [part.type, part.value]),
    )

    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

/**
 * 递归转换响应数据中的时间为标准北京时间字符串。
 */
export function formatResponseDateTimes(value: unknown): unknown {
    if (value instanceof Date) {
        return formatBeijingDateTime(value)
    }

    if (Array.isArray(value)) {
        return value.map(item => formatResponseDateTimes(item))
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                formatResponseDateTimes(item),
            ]),
        )
    }

    return value
}

/**
 * 判断值是否为可安全遍历的普通对象。
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') {
        return false
    }

    const prototype = Object.getPrototypeOf(value) as object | null

    return prototype === Object.prototype || prototype === null
}
