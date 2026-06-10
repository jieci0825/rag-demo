import type { ErrorDefinition } from '../constants/error-definitions.js'

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
     * 根据统一错误定义创建可识别的业务异常。
     */
    constructor(errorDefinition: ErrorDefinition, data: unknown = null) {
        super(
            errorDefinition.status,
            errorDefinition.errorCode,
            errorDefinition.message,
            data,
        )
        this.name = 'AppError'
    }
}

/**
 * 判断错误是否为服务端主动抛出的已知异常。
 */
export function isKnownException(error: unknown): error is KnownException {
    return error instanceof KnownException
}
