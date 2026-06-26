import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './db/client'
import { APP_ENV } from './config/env'
import app from './server'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = join(__dirname, 'db', 'migrations')

const main = async () => {
  console.log(`[migrate] running pending migrations from ${migrationsFolder} ...`)
  await migrate(db, { migrationsFolder })
  console.log('[migrate] up to date')

  console.log(`[server] listening on http://0.0.0.0:${APP_ENV.port}`)
  return app
}

main().then((a) => {
  Bun.serve({ port: APP_ENV.port, fetch: a.fetch })
})
