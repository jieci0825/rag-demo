interface ErrorDefinitionShape {
    readonly errorCode: number
    readonly status: number
    readonly message: string
    readonly description: string
}

/**
 * 服务端错误定义，统一维护业务错误码、HTTP 状态、前端消息和错误说明。
 */
export const ERROR_DEFINITIONS = {
    INVALID_REQUEST_PAYLOAD: {
        errorCode: 10001,
        status: 400,
        message: 'Invalid request payload',
        description: '请求参数未通过服务端校验',
    },
    ROUTE_NOT_FOUND: {
        errorCode: 10002,
        status: 404,
        message: 'Route not found',
        description: '请求的接口路由不存在',
    },
    INTERNAL_SERVER_ERROR: {
        errorCode: 10003,
        status: 500,
        message: 'Internal server error',
        description: '服务端发生未被业务错误处理的异常',
    },
    DOCUMENT_CONTENT_ALREADY_EXISTS: {
        errorCode: 20001,
        status: 409,
        message: 'Document content already exists',
        description: '文档内容哈希与已有文档重复',
    },
    CHAT_SERVICE_FAILED: {
        errorCode: 30001,
        status: 502,
        message: 'Chat service failed',
        description: '聊天模型服务调用失败',
    },
    QUERY_TRANSFORM_FAILED: {
        errorCode: 40001,
        status: 502,
        message: 'Query transform service failed',
        description: '查询转换模型调用失败或输出在重试后仍未通过校验',
    },
    QUERY_LOG_NOT_FOUND: {
        errorCode: 50001,
        status: 404,
        message: 'Query log not found',
        description: '指定的查询日志不存在',
    },
} as const satisfies Record<string, ErrorDefinitionShape>

export type ErrorDefinition =
    typeof ERROR_DEFINITIONS[keyof typeof ERROR_DEFINITIONS]
