import { pgTable, text, uuid, timestamp, integer, index, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { customers } from './customers'
import { tenants } from './tenants'
import { CUSTOMER_STAGES, VISIT_TYPES, VISIT_RESULTS } from '../../lib/stage'

export const visits = pgTable(
  'visits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 租户 ID。冗余字段（也可通过 customerId 关联得到），但加冗余索引查询更快 */
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    salesmanId: uuid('salesman_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    type: text('type').notNull().default('normal'),
    result: text('result').notNull(),
    content: text('content').notNull(),
    durationMin: integer('duration_min'),
    nextStep: text('next_step'),
    stageBefore: text('stage_before'),
    stageAfter: text('stage_after'),
    visitedAt: timestamp('visited_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('visits_tenant_id_idx').on(t.tenantId),
    index('visits_customer_id_idx').on(t.customerId),
    index('visits_salesman_id_idx').on(t.salesmanId),
    index('visits_visited_at_idx').on(t.visitedAt.desc()),
    index('visits_tenant_salesman_idx').on(t.tenantId, t.salesmanId),
    index('visits_tenant_visited_idx').on(t.tenantId, t.visitedAt.desc()),
    check('visits_type_check', sql.raw(`type IN (${VISIT_TYPES.map((s) => `'${s}'`).join(',')})`)),
    check('visits_result_check', sql.raw(`result IN (${VISIT_RESULTS.map((s) => `'${s}'`).join(',')})`)),
    check(
      'visits_stage_before_check',
      sql.raw(`stage_before IS NULL OR stage_before IN (${CUSTOMER_STAGES.map((s) => `'${s}'`).join(',')})`),
    ),
    check(
      'visits_stage_after_check',
      sql.raw(`stage_after IS NULL OR stage_after IN (${CUSTOMER_STAGES.map((s) => `'${s}'`).join(',')})`),
    ),
  ],
)

export type Visit = typeof visits.$inferSelect
export type NewVisit = typeof visits.$inferInsert
