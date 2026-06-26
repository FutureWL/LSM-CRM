import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, sql } from './client'

// 从 migrate.ts 自身所在目录向上找到 migrations
const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = join(__dirname, 'migrations')

const main = async () => {
  console.log(`[migrate] running pending migrations from ${migrationsFolder} ...`)
  await migrate(db, { migrationsFolder })
  console.log('[migrate] up to date')
  await sql.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('[migrate] failed:', err)
  process.exit(1)
})
