import pino from 'pino'

import { env } from '../config/env.js'

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

export const logger = pino({
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
