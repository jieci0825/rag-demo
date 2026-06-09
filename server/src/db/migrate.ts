import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { logger } from '../lib/logger.js'
import { db, closeDb } from './index.js'

/**
 * 执行 Drizzle 已生成的数据库迁移文件。
 */
export async function runMigrations(): Promise<void> {
    const startedAt = Date.now()

    logger.info('Database migration started')

    try {
        await migrate(db, { migrationsFolder: 'drizzle' })
        logger.info({
            durationMs: Date.now() - startedAt,
        }, 'Database migration completed')
    } finally {
        await closeDb()
    }
}

if (
    process.argv[1]?.endsWith('migrate.ts') ||
    process.argv[1]?.endsWith('migrate.js')
) {
    runMigrations().catch((error: unknown) => {
        logger.fatal({ err: error }, 'Database migration failed')
        process.exit(1)
    })
}
