import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from '../auth/password'
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const auth = new Hono()
  .post('/auth/login', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid login payload', parsed.error.flatten())
    }
    const { email, password } = parsed.data
    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    const user = rows[0]
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password')
    }
    const { rawToken } = await createSession(user.id, c.req.header('user-agent') ?? undefined)
    setSessionCookie(c, rawToken)
    return ok(c, { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl })
  })
  .post('/auth/logout', async (c) => {
    const raw = getSessionCookie(c)
    if (raw) await deleteSessionByRawToken(raw)
    clearSessionCookie(c)
    return ok(c, { loggedOut: true })
  })
  .get('/auth/me', requireAuth(), (c) => {
    const u = c.get('user')
    return ok(c, { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl })
  })