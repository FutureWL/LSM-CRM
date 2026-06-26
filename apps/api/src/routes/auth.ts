import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { users, tenantMemberships, tenants } from '../db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '../auth/password'
import { checkPasswordStrength } from '../auth/password-policy'
import {
  createSession,
  deleteSessionByRawToken,
  getSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from '../auth/session'
import { requireAuth } from '../auth/middleware'
import { ok } from '../lib/response'
import { AppError } from '../lib/errors'
import { ErrorMessages } from '../lib/error-messages'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(128),
})

// 公共：用户响应（包含安全相关字段）
function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    mustChangePassword: u.mustChangePassword,
  }
}

/**
 * 用户名下的租户列表（含角色），登录时返回
 */
async function listUserTenants(userId: string) {
  return db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(and(eq(tenantMemberships.userId, userId), eq(tenants.status, 'active')))
    .orderBy(asc(tenants.name))
}

export const auth = new Hono()
  .post('/auth/login', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_INVALID_PAYLOAD, parsed.error.flatten())
    }
    const { email, password } = parsed.data
    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    const user = rows[0]
    if (!user || !user.isActive || !(await verifyPassword(user.passwordHash, password))) {
      // 不区分"用户不存在"和"密码错误"，避免账号枚举
      throw new AppError('UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_INVALID_CREDENTIALS)
    }
    const { rawToken } = await createSession(user.id, c.req.header('user-agent') ?? undefined)
    setSessionCookie(c, rawToken)
    const tenants = await listUserTenants(user.id)
    return ok(c, { ...publicUser(user), tenants })
  })
  .post('/auth/logout', async (c) => {
    const raw = getSessionCookie(c)
    if (raw) await deleteSessionByRawToken(raw)
    clearSessionCookie(c)
    return ok(c, { loggedOut: true })
  })
  .get('/auth/me', requireAuth(), async (c) => {
    const u = c.get('user')
    const tenants = await listUserTenants(u.id)
    return ok(c, { ...publicUser(u), tenants })
  })
  /**
   * 修改密码。无需提供 currentPassword 时也可调用（用于强制改密流程）。
   * body 两种形态：
   *   1) 必须改密（mustChangePassword=true）：仅传 { newPassword }，服务端不再校验旧密码
   *   2) 主动改密：传 { currentPassword, newPassword }
   * 成功后清 mustChangePassword、记 passwordChangedAt，并使其他会话失效（v0.5+ 再做）
   */
  .post('/auth/change-password', requireAuth(), async (c) => {
    const u = c.get('user')
    const body = await c.req.json().catch(() => null)
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_INVALID_PAYLOAD, parsed.error.flatten())
    }
    const { currentPassword, newPassword } = parsed.data

    // 主动改密：必须验证旧密码；强制改密流程可省略
    if (!u.mustChangePassword) {
      if (!currentPassword) {
        throw new AppError('VALIDATION_ERROR', '主动修改密码时必须提供当前密码')
      }
      if (!(await verifyPassword(u.passwordHash, currentPassword))) {
        throw new AppError('UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_CURRENT_PASSWORD)
      }
    }

    // 强度校验（不允许与个人信息 / 旧密码相同）
    const check = checkPasswordStrength(newPassword, {
      email: u.email,
      name: u.name,
      oldPassword: u.mustChangePassword ? undefined : currentPassword,
    })
    if (!check.ok) {
      throw new AppError('VALIDATION_ERROR', ErrorMessages.PASSWORD_TOO_WEAK(check.errors), { errors: check.errors })
    }

    const newHash = await hashPassword(newPassword)
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, u.id))

    return ok(c, { changed: true })
  })
