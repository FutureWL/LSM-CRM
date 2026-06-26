import { pgTable, text, uuid, timestamp, boolean } from 'drizzle-orm/pg-core'
import { userRoleEnum } from './enums'

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
