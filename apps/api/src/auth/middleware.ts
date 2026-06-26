import type { MiddlewareHandler } from 'hono'
import { db } from '../db/client'
import { users, type User } from '../db/schema'
import { eq } from 'drizzle-orm'
import { fail } from '../lib/response'
import { ErrorMessages } from '../lib/error-messages'
import { getSessionCookie, getSession } from './session'

declare module 'hono' {
  interface ContextVariableMap {
    user: User
  }
}

export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const raw = getSessionCookie(c)
    if (!raw) return fail(c, 'UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_NO_SESSION, 401)
    const session = await getSession(raw)
    if (!session) return fail(c, 'UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_SESSION_EXPIRED, 401)
    const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    const user = rows[0]
    if (!user) return fail(c, 'UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_USER_NOT_FOUND, 401)
    c.set('user', user)
    await next()
  }
}

export function requireRole(role: 'admin' | 'sales'): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) return fail(c, 'UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_NO_SESSION, 401)
    if (user.role !== role) return fail(c, 'FORBIDDEN', `无权操作，需要角色: ${role}`, 403)
    await next()
  }
}

// 必须改密时白名单（这些路由即使 mustChangePassword=true 也放行）
const PASSWORD_CHANGE_ALLOWLIST = new Set([
  '/api/v1/auth/change-password',
  '/api/v1/auth/logout',
  '/api/v1/auth/me', // 前端需根据 mustChangePassword 跳转
])

/**
 * 组合中间件：先鉴权（requireAuth），再校验是否需要改密。
 * 用于需要登录的业务路由。
 * 用法：app.use('/api/v1/users/*', requireAuthAndPasswordOk())
 *      app.use('/api/v1/customers/*', requireAuthAndPasswordOk())
 */
export function requireAuthAndPasswordOk(): MiddlewareHandler {
  return async (c, next) => {
    // 先跑 requireAuth 逻辑
    const raw = getSessionCookie(c)
    if (!raw) return fail(c, 'UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_NO_SESSION, 401)
    const session = await getSession(raw)
    if (!session) return fail(c, 'UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_SESSION_EXPIRED, 401)
    const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    const user = rows[0]
    if (!user) return fail(c, 'UNAUTHORIZED', ErrorMessages.UNAUTHORIZED_USER_NOT_FOUND, 401)
    c.set('user', user)

    // 再校验改密
    if (user.mustChangePassword && !PASSWORD_CHANGE_ALLOWLIST.has(c.req.path)) {
      return fail(
        c,
        'PASSWORD_CHANGE_REQUIRED',
        '必须先修改密码',
        403,
        { mustChangePassword: true },
      )
    }
    await next()
  }
}
