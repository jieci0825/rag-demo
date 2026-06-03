import { createServer } from 'node:http'

import { createApp } from './app.js'
import { env } from './config/env.js'

/**
 * 启动 HTTP 服务并监听配置端口。
 */
export function startServer(): void {
    const app = createApp()
    const server = createServer(app.callback())

    server.listen(env.PORT, () => {
        console.log(`Server listening on http://localhost:${env.PORT}`)
    })
}

/**
 * 注册进程级异常处理。
 */
function registerProcessHandlers(): void {
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error)
        process.exit(1)
    })

    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection:', reason)
        process.exit(1)
    })
}

registerProcessHandlers()
startServer()
