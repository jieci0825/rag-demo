export const ERROR_CODES = {
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const

/**
 * 表示服务端可控的业务或基础设施错误。
 */
export class AppError extends Error {
    public readonly code: string
    public readonly details?: unknown
    public readonly status: number

    /**
     * 创建统一错误响应可识别的错误实例。
     */
    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message)
        this.name = 'AppError'
        this.status = status
        this.code = code
        this.details = details
    }
}

/**
 * 判断错误是否为服务端主动抛出的统一错误。
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError
}
