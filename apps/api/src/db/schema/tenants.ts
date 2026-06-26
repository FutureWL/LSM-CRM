// =============================================================================
// 多租户 - tenants 表 + tenant_memberships 表
// =============================================================================
// 设计：
// - tenants 持有租户基本信息（公司名、slug、状态、套餐）
// - tenant_memberships 是 user × tenant 的多对多表，附带角色（admin/sales）
// - 一个用户可以属于多个租户（SaaS 场景），内部使用通常一个用户一个租户
// - users.last_active_tenant_id 记住用户上次操作的租户（避免每次选）
// - 所有业务表（customers/visits/transfers/sessions）都加 tenant_id 列
// - tenant_id 是必填项；任何 query 必须先 resolve 到一个 tenant 才能查数据
// =============================================================================

import { pgTable, text, uuid, timestamp, index, unique, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { userRoleEnum } from './enums'
import { users } from './users'

// ---- 租户状态 ----
export const tenantStatusEnum = ['active', 'suspended', 'deleted'] as const
export type TenantStatus = (typeof tenantStatusEnum)[number]

// ---- 租户套餐 ----
export const tenantPlanEnum = ['free', 'team', 'business', 'enterprise'] as const
export type TenantPlan = (typeof tenantPlanEnum)[number]

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 租户名（公司全称） */
    name: text('name').notNull(),
    /** 短标识，用于 URL ?tenant=xxx；同租户内全局唯一 */
    slug: text('slug').notNull().unique(),
    /** 状态：active / suspended / deleted */
    status: text('status', { enum: tenantStatusEnum }).notNull().default('active'),
    /** 套餐：free / team / business / enterprise（v0.5+ 启用计费时使用） */
    plan: text('plan', { enum: tenantPlanEnum }).notNull().default('team'),
    /** 备注（管理员可见） */
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('tenants_slug_charset', sql.raw(`slug ~ '^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$'`)),
    check('tenants_slug_length', sql.raw(`length(slug) BETWEEN 2 AND 32`)),
  ],
)

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

// ---- 用户 × 租户 关联 ----
export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 该用户在此租户内的角色 */
    role: userRoleEnum('role').notNull(),
    /** 状态：active / invited / suspended */
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('tenant_memberships_tenant_user_uq').on(t.tenantId, t.userId),
    index('tenant_memberships_user_id_idx').on(t.userId),
    index('tenant_memberships_tenant_id_idx').on(t.tenantId),
  ],
)

export type TenantMembership = typeof tenantMemberships.$inferSelect
export type NewTenantMembership = typeof tenantMemberships.$inferInsert
