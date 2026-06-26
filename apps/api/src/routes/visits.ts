import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { visits, customers, type Visit } from '../db/schema'
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm'
import { requireAuthAndPasswordOk } from '../auth/middleware'
import { ok } from '../lib/response'
import { AppError } from '../lib/errors'
import { ErrorMessages } from '../lib/error-messages'
import { CUSTOMER_STAGES, VISIT_TYPES, VISIT_RESULTS } from '../lib/stage'

const listQuery = z.object({
  customerId: z.string().uuid().optional(),
  salesmanId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

function toVisitDto(v: Visit) {
  return {
    id: v.id,
    customerId: v.customerId,
    salesmanId: v.salesmanId,
    type: v.type,
    result: v.result,
    content: v.content,
    durationMin: v.durationMin,
    nextStep: v.nextStep,
    stageBefore: v.stageBefore,
    stageAfter: v.stageAfter,
    visitedAt: v.visitedAt.toISOString(),
    createdAt: v.createdAt.toISOString(),
  }
}

export const visitsRoute = new Hono()
  .get('/visits', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const raw = Object.fromEntries(new URL(c.req.url).searchParams)
    const parsed = listQuery.safeParse(raw)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_INVALID_QUERY, parsed.error.flatten())
    const { customerId, salesmanId, from, to, page, limit } = parsed.data

    const where = [isNull(visits.deletedAt)]
    if (me.role === 'sales') where.push(eq(visits.salesmanId, me.id))
    if (customerId) where.push(eq(visits.customerId, customerId))
    if (salesmanId && me.role === 'admin') where.push(eq(visits.salesmanId, salesmanId))
    if (from) where.push(gte(visits.visitedAt, from))
    if (to) where.push(lte(visits.visitedAt, to))

    const offset = (page - 1) * limit
    const rows = await db
      .select()
      .from(visits)
      .where(and(...where))
      .orderBy(desc(visits.visitedAt))
      .limit(limit)
      .offset(offset)
    return ok(c, { items: rows.map(toVisitDto), page, limit })
  })
  .post('/visits', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const body = await c.req.json().catch(() => null)
    const schema = z.object({
      customerId: z.string().uuid(),
      type: z.enum(VISIT_TYPES).default('normal'),
      result: z.enum(VISIT_RESULTS),
      content: z.string().min(1).max(2000),
      durationMin: z.number().int().positive().max(1440).optional(),
      nextStep: z.string().max(500).optional(),
      stageBefore: z.enum(CUSTOMER_STAGES).optional(),
      stageAfter: z.enum(CUSTOMER_STAGES).optional(),
      visitedAt: z.coerce.date().default(() => new Date()),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_INVALID_PAYLOAD, parsed.error.flatten())
    const data = parsed.data

    return await db.transaction(async (tx) => {
      const custRows = await tx.select().from(customers).where(eq(customers.id, data.customerId)).limit(1)
      const cust = custRows[0]
      if (!cust) throw new AppError('NOT_FOUND', ErrorMessages.RESOURCE_CUSTOMER_NOT_FOUND)
      if (me.role === 'sales' && cust.ownerId !== me.id) throw new AppError('FORBIDDEN', ErrorMessages.FORBIDDEN_NOT_YOUR_CUSTOMER)

      const inserted = await tx
        .insert(visits)
        .values({
          customerId: data.customerId,
          salesmanId: me.id,
          type: data.type,
          result: data.result,
          content: data.content,
          durationMin: data.durationMin,
          nextStep: data.nextStep,
          stageBefore: data.stageBefore,
          stageAfter: data.stageAfter,
          visitedAt: data.visitedAt,
        })
        .returning()
      const row = inserted[0]!

      const updates: Record<string, unknown> = {
        lastVisitAt: data.visitedAt,
        updatedAt: new Date(),
      }
      if (data.stageAfter && data.stageAfter !== cust.stage) {
        updates.stage = data.stageAfter
      }
      await tx.update(customers).set(updates).where(eq(customers.id, data.customerId))

      return ok(c, toVisitDto(row), 201)
    })
  })
  .delete('/visits/:id', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const existingRows = await db.select().from(visits).where(eq(visits.id, id)).limit(1)
    const existing = existingRows[0]
    if (!existing) throw new AppError('NOT_FOUND', ErrorMessages.RESOURCE_VISIT_NOT_FOUND)
    if (existing.deletedAt) throw new AppError('NOT_FOUND', ErrorMessages.RESOURCE_VISIT_ALREADY_DELETED)
    if (me.role !== 'admin' && existing.salesmanId !== me.id) {
      throw new AppError('FORBIDDEN', ErrorMessages.FORBIDDEN_NOT_YOUR_VISIT)
    }
    await db.update(visits).set({ deletedAt: new Date() }).where(eq(visits.id, id))
    return ok(c, { deleted: true, id })
  })
