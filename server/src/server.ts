import { createServer } from 'node:http'

import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'

/**
 * 启动 HTTP 服务并监听配置端口。
 */
export function startServer(): void {
    const app = createApp()
    const server = createServer(app.callback())

    server.listen(env.PORT, () => {
        logger.info({
            port: env.PORT,
            url: `http://localhost:${env.PORT}`,
        }, 'Server started')
    })
}

/**
 * 注册进程级异常处理。
 */
function registerProcessHandlers(): void {
    process.on('uncaughtException', (error) => {
        logger.fatal({ err: error }, 'Uncaught exception')
        process.exit(1)
    })

    process.on('unhandledRejection', (reason) => {
        logger.fatal({ err: reason }, 'Unhandled rejection')
        process.exit(1)
    })
}

registerProcessHandlers()
startServer()
