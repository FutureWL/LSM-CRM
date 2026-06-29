import { pgTable, text, uuid, timestamp, index, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { tenants } from './tenants'

// sessions.id = SHA-256 hex of the cookie token. DB never holds the raw bearer token.
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * 会话所属租户。同一用户可能在多个租户有不同 session，
     * 也可以用一条 session 在多个租户间切换（v0.5 考虑）。当前为简化：登录时绑定一个 tenant。
     */
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * 最后活跃时间. 每次鉴权中间件访问时更新 (touch).
     * 用于实现 idle timeout: (now - lastActiveAt) > SESSION_IDLE_SEC 则视为过期
     * 与 expiresAt 互补:
     *   - expiresAt = 硬上限 (7 天), 签发后不可延
     *   - lastActiveAt = 软上限 (30 分钟), 活跃用户每次访问自动续命
     */
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    userAgent: text('user_agent'),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_tenant_id_idx').on(t.tenantId),
    index('sessions_expires_at_idx').on(t.expiresAt),
    index('sessions_last_active_at_idx').on(t.lastActiveAt),
    check('sessions_id_length', sql.raw(`length(id) BETWEEN 32 AND 128`)),
    check('sessions_id_charset', sql.raw(`id ~ '^[A-Za-z0-9]+$'`)),
  ],
)

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
