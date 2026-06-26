import type { MiddlewareHandler } from 'hono'
import { db } from '../db/client'
import { users, type User } from '../db/schema'
import { eq } from 'drizzle-orm'
import { fail } from '../lib/response'
import { getSessionCookie, getSession } from './session'

declare module 'hono' {
  interface ContextVariableMap {
    user: User
  }
}

export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const raw = getSessionCookie(c)
    if (!raw) return fail(c, 'UNAUTHORIZED', 'No session', 401)
    const session = await getSession(raw)
    if (!session) return fail(c, 'UNAUTHORIZED', 'Session expired or invalid', 401)
    const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    const user = rows[0]
    if (!user) return fail(c, 'UNAUTHORIZED', 'User not found', 401)
    c.set('user', user)
    await next()
  }
}

export function requireRole(role: 'admin' | 'sales'): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) return fail(c, 'UNAUTHORIZED', 'Auth required', 401)
    if (user.role !== role) return fail(c, 'FORBIDDEN', `Requires role: ${role}`, 403)
    await next()
  }
}