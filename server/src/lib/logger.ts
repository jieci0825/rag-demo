import { AsyncLocalStorage } from 'node:async_hooks'

import pino from 'pino'

import { env } from '../config/env.js'

import type { Logger } from 'pino'

const transport = env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
            singleLine: true,
            translateTime: 'SYS:standard',
        },
    }
    : undefined

const logger = pino({
    level: env.LOG_LEVEL,
    base: {
        service: 'rag-demo-server',
    },
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'request.headers.authorization',
            'request.headers.cookie',
        ],
        censor: '[Redacted]',
    },
    transport,
})

const loggerStorage = new AsyncLocalStorage<Logger>()

/**
 * 在指定日志上下文中执行回调，并向后续异步调用传递该上下文。
 */
export function runWithLogContext<T>(
    context: LogContext,
    callback: () => T,
): T {
    const currentLogger = loggerStorage.getStore() ?? logger

    return loggerStorage.run(currentLogger.child(context), callback)
}

/**
 * 使用当前异步上下文中的 logger 输出结构化日志。
 */
export function log(
    type: LogType,
    message: string,
    context?: LogContext,
): void {
    const currentLogger = loggerStorage.getStore() ?? logger

    if (context) {
        currentLogger[type](context, message)
        return
    }

    currentLogger[type](message)
}

export type LogContext = Record<string, unknown>

export type LogType = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
