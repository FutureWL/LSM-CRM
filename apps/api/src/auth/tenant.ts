// =============================================================================
// 租户解析中间件
// =============================================================================
// 解析顺序：
//   1) Query 参数 ?tenant=acme （前端路由直接指定）
//   2) Header  X-Tenant: acme （API 调用方）
//   3) 用户上次的 lastActiveTenantId （DB 字段）
//   4) 用户在 tenant_memberships 中的第一个 active 租户
//   5) 默认租户 'default' （兜底）
//
// 用法：
//   import { tenantContext } from '../auth/tenant'
//   app.use('/api/v1/customers/*', requireAuthAndPasswordOk(), tenantContext())
//   app.get('/customers', async (c) => {
//     const tenantId = c.get('tenantId')  // UUID string
//     ...
//   })
// =============================================================================

import type { MiddlewareHandler } from 'hono'
import { and, asc, eq, isNotNull } from 'drizzle-orm'
import { db } from '../db/client'
import { tenants, tenantMemberships, users } from '../db/schema'
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../lib/tenant-constants'
import { AppError } from '../lib/errors'

declare module 'hono' {
  interface ContextVariableMap {
    tenantId: string
    tenantSlug: string
  }
}

interface ResolvedTenant {
  id: string
  slug: string
}

/**
 * 解析当前请求的 tenant。
 * 内部使用：先 user.lastActiveTenantId → fallback to memberships 中第一个 → default
 */
async function resolveTenantForUser(userId: string, requestedSlug?: string): Promise<ResolvedTenant> {
  // 1) 显式 ?tenant=xxx / X-Tenant: xxx
  if (requestedSlug) {
    const t = await db
      .select({ id: tenants.id, slug: tenants.slug, status: tenants.status })
      .from(tenants)
      .where(and(eq(tenants.slug, requestedSlug), eq(tenants.status, 'active')))
      .limit(1)
    if (t[0]) {
      // 还要验证用户是否属于此租户
      const m = await db
        .select({ id: tenantMemberships.id })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenantId, t[0].id),
            eq(tenantMemberships.userId, userId),
            eq(tenantMemberships.status, 'active'),
          ),
        )
        .limit(1)
      if (m[0]) return { id: t[0].id, slug: t[0].slug }
    }
    // 用户请求的 tenant 无效或无权限 → 403（不要静默 fallback，可能掩盖 bug）
    throw new AppError(
      'FORBIDDEN',
      `无权访问租户 ${requestedSlug}，或该租户不存在 / 未激活`,
      { requestedSlug },
    )
  }

  // 2) user.lastActiveTenantId
  const u = await db
    .select({ tenantId: users.lastActiveTenantId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (u[0]?.tenantId) {
    const t = await db
      .select({ id: tenants.id, slug: tenants.slug, status: tenants.status })
      .from(tenants)
      .where(and(eq(tenants.id, u[0].tenantId), eq(tenants.status, 'active')))
      .limit(1)
    if (t[0]) return { id: t[0].id, slug: t[0].slug }
  }

  // 3) 用户的第一个 active 租户
  const m = await db
    .select({ id: tenantMemberships.tenantId, slug: tenants.slug })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(
      and(
        eq(tenantMemberships.userId, userId),
        eq(tenantMemberships.status, 'active'),
        eq(tenants.status, 'active'),
        isNotNull(tenants.id),
      ),
    )
    .orderBy(asc(tenantMemberships.createdAt))
    .limit(1)
  if (m[0]) {
    return { id: m[0].id, slug: m[0].slug }
  }

  // 4) 兜底：default 租户
  return { id: DEFAULT_TENANT_ID, slug: DEFAULT_TENANT_SLUG }
}

/**
 * 同步更新用户的 lastActiveTenantId（仅在显式传入 ?tenant=xxx 时更新）
 */
async function touchUserLastActiveTenant(userId: string, tenantId: string) {
  try {
    await db.update(users).set({ lastActiveTenantId: tenantId, updatedAt: new Date() }).where(eq(users.id, userId))
  } catch {
    // 静默失败，不影响主流程
  }
}

/**
 * 租户上下文中间件。
 * 必须放在 requireAuth() 或 requireAuthAndPasswordOk() 之后（依赖 c.get('user')）。
 */
export function tenantContext(): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      // 鉴权失败已在上游拦截，这里理论上不会到
      throw new AppError('UNAUTHORIZED', '鉴权未通过')
    }

    // 解析：query → header
    const requestedSlug =
      c.req.query('tenant') ||
      c.req.header('x-tenant') ||
      undefined

    const isExplicit = !!requestedSlug
    const tenant = await resolveTenantForUser(user.id, requestedSlug)
    c.set('tenantId', tenant.id)
    c.set('tenantSlug', tenant.slug)

    // 显式指定时才更新 lastActiveTenantId（避免每次请求都写 DB）
    if (isExplicit) {
      await touchUserLastActiveTenant(user.id, tenant.id)
    }

    await next()
  }
}
