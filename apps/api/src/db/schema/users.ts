import { pgTable, text, uuid, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { userRoleEnum } from './enums'
import { tenants } from './tenants'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  avatarUrl: text('avatar_url'),
  teamId: uuid('team_id'),
  isActive: boolean('is_active').notNull().default(true),
  /**
   * 强制下次登录修改密码。生产环境首批演示账号 / 管理员重置密码后置 true。
   * 鉴权中间件遇到此标志为 true 时，除 /auth/change-password 外拒绝所有请求。
   */
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  /**
   * 最后修改密码时间。用于未来密码过期策略（v0.5+）。
   */
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  /**
   * 上次活跃租户。Sass / 内部 20 销售通常一个用户一个租户，
   * 但架构上允许一个用户属于多个租户（多公司销售代理等场景）。
   * 登录时若 query 传 ?tenant=xxx，会更新此字段。
   */
  lastActiveTenantId: uuid('last_active_tenant_id').references(() => tenants.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
