import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { APP_ENV } from '../config/env'
import * as schema from './schema'

// 生产强制 SSL，开发可选。rejectUnauthorized=true 避免 MITM。
// 'verify-full' = 验证 CA + hostname，等价 rejectUnauthorized:true 但类型安全
const ssl: postgres.Options<Record<string, postgres.PostgresType>>['ssl'] =
  APP_ENV.nodeEnv === 'production' ? 'verify-full' : false

export const sql = postgres(APP_ENV.databaseUrl, { max: 10, ssl })
export const db = drizzle(sql, { schema })
