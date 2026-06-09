/**
 * 表示服务端可控且可统一返回的已知异常。
 */
export class KnownException<TData = unknown> extends Error {
    public readonly data: TData
    public readonly errorCode: number
    public readonly status: number

    /**
     * 创建全局异常处理器可识别的已知异常。
     */
    constructor(status: number, errorCode: number, message: string, data: TData) {
        super(message)
        this.name = 'KnownException'
        this.status = status
        this.errorCode = errorCode
        this.data = data
    }
}

/**
 * 表示通过全局异常处理器返回的成功结果。
 */
export class SuccessException<TData> extends KnownException {
    /**
     * 创建成功响应异常。
     */
    constructor(data: TData, status = 200) {
        super(status, 0, 'success', data)
        this.name = 'SuccessException'
    }
}

/**
 * 表示服务端可控的业务或基础设施错误。
 */
export class AppError extends KnownException {
    /**
     * 创建统一错误响应可识别的错误实例。
     */
    constructor(status: number, message: string, data: unknown = null) {
        super(status, status, message, data)
        this.name = 'AppError'
    }
}

/**
 * 表示请求参数校验失败。
 */
export class ValidationError extends AppError {
    /**
     * 创建请求参数校验失败异常。
     */
    constructor(details?: unknown) {
        super(400, 'Invalid request payload', details ?? null)
        this.name = 'ValidationError'
    }
}

/**
 * 表示请求与服务端现有资源发生冲突。
 */
export class ConflictError extends AppError {
    /**
     * 创建资源冲突异常。
     */
    constructor(message: string, data: unknown = null) {
        super(409, message, data)
        this.name = 'ConflictError'
    }
}

/**
 * 表示请求路由不存在。
 */
export class NotFoundError extends AppError {
    /**
     * 创建路由不存在异常。
     */
    constructor(message = 'Route not found') {
        super(404, message)
        this.name = 'NotFoundError'
    }
}

/**
 * 判断错误是否为服务端主动抛出的已知异常。
 */
export function isKnownException(error: unknown): error is KnownException {
    return error instanceof KnownException
}
