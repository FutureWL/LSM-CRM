import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { users, type User } from '../db/schema'
import { and, asc, eq, ne } from 'drizzle-orm'
import { requireAuthAndPasswordOk } from '../auth/middleware'
import { hashPassword, verifyPassword } from '../auth/password'
import { ok } from '../lib/response'
import { AppError } from '../lib/errors'

function publicView(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }
}

const createSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'sales']),
  password: z.string().min(8).max(100),
})

// PATCH schema — 所有字段 optional，根据身份判断哪些字段允许
const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(200).optional(),
  role: z.enum(['admin', 'sales']).optional(),
  isActive: z.boolean().optional(),
  // 管理员重置任意用户的密码（不需 currentPassword）
  password: z.string().min(8).max(100).optional(),
  // 自己改密码时需要提供当前密码
  currentPassword: z.string().min(1).optional(),
})

export const usersRoute = new Hono()
  .get('/users', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    if (me.role !== 'admin') throw new AppError('FORBIDDEN', 'Admin only')
    // 默认隐藏已停用账号；?includeInactive=1 时返回全部
    const includeInactive = c.req.query('includeInactive') === '1'
    const where = includeInactive ? undefined : eq(users.isActive, true)
    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(asc(users.name))
    return ok(c, rows.map(publicView))
  })
  .get('/users/sales', requireAuthAndPasswordOk(), async (c) => {
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'sales'), eq(users.isActive, true)))
      .orderBy(asc(users.name))
    return ok(c, rows.map(publicView))
  })
  .get('/users/:id', requireAuthAndPasswordOk(), async (c) => {
    const id = c.req.param('id')
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    const u = rows[0]
    if (!u) throw new AppError('NOT_FOUND', 'User not found')
    return ok(c, publicView(u))
  })
  .post('/users', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    if (me.role !== 'admin') throw new AppError('FORBIDDEN', 'Admin only')
    const body = await c.req.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid payload', parsed.error.flatten())
    }
    const data = parsed.data
    const emailLower = data.email.toLowerCase()
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailLower))
      .limit(1)
    if (existing[0]) throw new AppError('CONFLICT', 'Email already in use')
    const passwordHash = await hashPassword(data.password)
    const inserted = await db
      .insert(users)
      .values({
        name: data.name,
        email: emailLower,
        passwordHash,
        role: data.role,
        isActive: true,
      })
      .returning()
    return ok(c, publicView(inserted[0]!), 201)
  })
  .patch('/users/:id', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const isSelf = me.id === id
    const isAdmin = me.role === 'admin'
    if (!isSelf && !isAdmin) throw new AppError('FORBIDDEN', 'Cannot modify other users')

    const body = await c.req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid payload', parsed.error.flatten())
    }
    const data = parsed.data
    if (Object.keys(data).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No fields to update')
    }

    const existingRows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    const existing = existingRows[0]
    if (!existing) throw new AppError('NOT_FOUND', 'User not found')

    // 权限边界
    if (!isAdmin) {
      // 自己只能改 name + 自己密码（带 currentPassword）
      if (data.role !== undefined) throw new AppError('FORBIDDEN', 'Cannot change role')
      if (data.email !== undefined) throw new AppError('FORBIDDEN', 'Cannot change email')
      if (data.isActive !== undefined) throw new AppError('FORBIDDEN', 'Cannot change active status')
      if (data.password !== undefined) {
        if (!data.currentPassword) {
          throw new AppError('VALIDATION_ERROR', 'currentPassword required to change own password')
        }
        const okPw = await verifyPassword(existing.passwordHash, data.currentPassword)
        if (!okPw) throw new AppError('UNAUTHORIZED', 'Current password incorrect')
      }
    } else {
      // admin 不能通过 PATCH 把自己降级（防自杀）
      if (isSelf && data.role !== undefined && data.role !== 'admin') {
        throw new AppError('VALIDATION_ERROR', 'Admin cannot demote self')
      }
      // admin 不能停用自己
      if (isSelf && data.isActive === false) {
        throw new AppError('VALIDATION_ERROR', 'Admin cannot deactivate self')
      }
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) patch.name = data.name
    if (data.email !== undefined) patch.email = data.email.toLowerCase()
    if (data.role !== undefined) patch.role = data.role
    if (data.isActive !== undefined) patch.isActive = data.isActive
    if (data.password !== undefined) patch.passwordHash = await hashPassword(data.password)

    const updated = await db.update(users).set(patch).where(eq(users.id, id)).returning()
    return ok(c, publicView(updated[0]!))
  })
  .delete('/users/:id', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    if (me.role !== 'admin') throw new AppError('FORBIDDEN', 'Admin only')
    const id = c.req.param('id')
    if (me.id === id) throw new AppError('VALIDATION_ERROR', 'Cannot delete self')

    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!existing[0]) throw new AppError('NOT_FOUND', 'User not found')

    // 不能删系统中最后一个 admin
    if (existing[0].role === 'admin') {
      const adminCountRows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.isActive, true), ne(users.id, id)))
      if (adminCountRows.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Cannot delete the last active admin')
      }
    }

    // 软删除：设 isActive=false（保留关联历史数据）
    await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id))
    return ok(c, { deleted: true, id })
  })