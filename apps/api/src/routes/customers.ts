import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { customers, customerTransfers, visits, users, type Customer } from '../db/schema'
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { requireAuthAndPasswordOk } from '../auth/middleware'
import { ok } from '../lib/response'
import { AppError } from '../lib/errors'
import { ErrorMessages } from '../lib/error-messages'
import { CUSTOMER_STAGES } from '../lib/stage'

const listQuery = z.object({
  stage: z.enum(CUSTOMER_STAGES).optional(),
  ownerId: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

function toCustomerDto(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    phone: c.phone,
    email: c.email,
    address: c.address,
    industry: c.industry,
    stage: c.stage,
    amount: Number(c.amount),
    ownerId: c.ownerId,
    lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export const customersRoute = new Hono()
  .get('/customers', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const raw = Object.fromEntries(new URL(c.req.url).searchParams)
    const parsed = listQuery.safeParse(raw)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_INVALID_QUERY, parsed.error.flatten())
    const { stage, ownerId, q, page, limit } = parsed.data

    const where = []
    if (me.role === 'sales') where.push(eq(customers.ownerId, me.id))
    if (stage) where.push(eq(customers.stage, stage))
    if (ownerId) where.push(eq(customers.ownerId, ownerId))
    if (q) where.push(or(ilike(customers.name, `%${q}%`), ilike(customers.company, `%${q}%`)))

    const offset = (page - 1) * limit
    const rows = await db
      .select()
      .from(customers)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(customers.name))
      .limit(limit)
      .offset(offset)

    const countResult = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(customers)
      .where(where.length ? and(...where) : undefined)
    const total = countResult[0]?.total ?? 0

    return ok(c, { items: rows.map(toCustomerDto), page, limit, total })
  })
  .get('/customers/:id', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
    const cust = rows[0]
    if (!cust) throw new AppError('NOT_FOUND', ErrorMessages.RESOURCE_CUSTOMER_NOT_FOUND)
    if (me.role === 'sales' && cust.ownerId !== me.id) throw new AppError('FORBIDDEN', ErrorMessages.FORBIDDEN_NOT_YOUR_CUSTOMER)

    const recentVisits = await db
      .select({
        id: visits.id,
        customerId: visits.customerId,
        salesmanId: visits.salesmanId,
        salesmanName: users.name,
        type: visits.type,
        result: visits.result,
        content: visits.content,
        durationMin: visits.durationMin,
        nextStep: visits.nextStep,
        stageBefore: visits.stageBefore,
        stageAfter: visits.stageAfter,
        visitedAt: visits.visitedAt,
        createdAt: visits.createdAt,
      })
      .from(visits)
      .leftJoin(users, eq(users.id, visits.salesmanId))
      .where(eq(visits.customerId, id))
      .orderBy(desc(visits.visitedAt))
      .limit(10)

    return ok(c, {
      ...toCustomerDto(cust),
      recentVisits: recentVisits.map((v) => ({
        ...v,
        visitedAt: v.visitedAt.toISOString(),
        createdAt: v.createdAt.toISOString(),
      })),
    })
  })
  .post('/customers', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const body = await c.req.json().catch(() => null)
    const schema = z.object({
      name: z.string().min(1).max(100),
      company: z.string().min(1).max(200),
      phone: z.string().min(1).max(50).optional(),
      email: z.string().email().optional(),
      address: z.string().max(500).optional(),
      industry: z.string().max(100).optional(),
      stage: z.enum(CUSTOMER_STAGES).default('new'),
      amount: z.number().nonnegative().default(0),
      ownerId: z.string().uuid().optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_INVALID_PAYLOAD, parsed.error.flatten())
    const data = parsed.data

    const ownerId = data.ownerId ?? me.id
    if (me.role === 'sales' && ownerId !== me.id) {
      throw new AppError('FORBIDDEN', ErrorMessages.FORBIDDEN_SALES_CREATE_OWNER)
    }
    if (data.ownerId) {
      const target = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, data.ownerId)).limit(1)
      if (!target[0] || target[0].role !== 'sales') {
        throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_OWNERID_NOT_SALES)
      }
    }

    const inserted = await db
      .insert(customers)
      .values({
        name: data.name,
        company: data.company,
        phone: data.phone,
        email: data.email,
        address: data.address,
        industry: data.industry,
        stage: data.stage,
        amount: String(data.amount),
        ownerId,
      })
      .returning()
    const row = inserted[0]!
    return ok(c, toCustomerDto(row), 201)
  })
  .patch('/customers/:id', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const existing = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
    const cust = existing[0]
    if (!cust) throw new AppError('NOT_FOUND', ErrorMessages.RESOURCE_CUSTOMER_NOT_FOUND)
    if (me.role === 'sales' && cust.ownerId !== me.id) throw new AppError('FORBIDDEN', ErrorMessages.FORBIDDEN_NOT_YOUR_CUSTOMER)

    const body = await c.req.json().catch(() => null)
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      company: z.string().min(1).max(200).optional(),
      phone: z.string().min(1).max(50).nullable().optional(),
      email: z.string().email().nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      industry: z.string().max(100).nullable().optional(),
      stage: z.enum(CUSTOMER_STAGES).optional(),
      amount: z.number().nonnegative().optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_INVALID_PAYLOAD, parsed.error.flatten())
    const data = parsed.data
    if (Object.keys(data).length === 0) throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_NO_FIELDS_TO_UPDATE)

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) patch.name = data.name
    if (data.company !== undefined) patch.company = data.company
    if (data.phone !== undefined) patch.phone = data.phone
    if (data.email !== undefined) patch.email = data.email
    if (data.address !== undefined) patch.address = data.address
    if (data.industry !== undefined) patch.industry = data.industry
    if (data.stage !== undefined) patch.stage = data.stage
    if (data.amount !== undefined) patch.amount = String(data.amount)

    const updated = await db.update(customers).set(patch).where(eq(customers.id, id)).returning()
    return ok(c, toCustomerDto(updated[0]!))
  })
  .post('/customers/:id/transfer', requireAuthAndPasswordOk(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => null)
    const schema = z.object({
      toUserId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_INVALID_PAYLOAD, parsed.error.flatten())
    const { toUserId, reason } = parsed.data

    const target = await db.select().from(users).where(eq(users.id, toUserId)).limit(1)
    if (!target[0] || target[0].role !== 'sales') {
      throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_TRANSFER_TARGET_INVALID)
    }

    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(customers).where(eq(customers.id, id)).limit(1)
      const cust = existing[0]
      if (!cust) throw new AppError('NOT_FOUND', ErrorMessages.RESOURCE_CUSTOMER_NOT_FOUND)
      if (me.role === 'sales' && cust.ownerId !== me.id) throw new AppError('FORBIDDEN', ErrorMessages.FORBIDDEN_NOT_YOUR_CUSTOMER)
      if (cust.ownerId === toUserId) throw new AppError('VALIDATION_ERROR', ErrorMessages.VALIDATION_TRANSFER_SAME_OWNER)

      await tx.insert(customerTransfers).values({
        customerId: id,
        fromUserId: cust.ownerId,
        toUserId,
        reason,
      })
      const updated = await tx
        .update(customers)
        .set({ ownerId: toUserId, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning()
      return ok(c, toCustomerDto(updated[0]!))
    })
  })
