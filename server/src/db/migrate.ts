import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { log } from '../lib/logger.js'
import { db, closeDb } from './index.js'

/**
 * 执行 Drizzle 已生成的数据库迁移文件。
 */
export async function runMigrations(): Promise<void> {
    const startedAt = Date.now()

    log('info', 'Database migration started')

    try {
        await migrate(db, { migrationsFolder: 'drizzle' })
        log('info', 'Database migration completed', {
            durationMs: Date.now() - startedAt,
        })
    } finally {
        await closeDb()
    }
}

if (
    process.argv[1]?.endsWith('migrate.ts') ||
    process.argv[1]?.endsWith('migrate.js')
) {
    runMigrations().catch((error: unknown) => {
        log('fatal', 'Database migration failed', { err: error })
        process.exit(1)
    })
}
