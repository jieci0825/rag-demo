import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { db, closeDb } from './index.js'

/**
 * 执行 Drizzle 已生成的数据库迁移文件。
 */
export async function runMigrations(): Promise<void> {
    try {
        await migrate(db, { migrationsFolder: 'drizzle' })
    } finally {
        await closeDb()
    }
}

if (
    process.argv[1]?.endsWith('migrate.ts') ||
    process.argv[1]?.endsWith('migrate.js')
) {
    runMigrations().catch((error: unknown) => {
        console.error(error)
        process.exit(1)
    })
}
