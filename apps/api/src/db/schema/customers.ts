import { pgTable, text, uuid, timestamp, numeric, index, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { CUSTOMER_STAGES } from '../../lib/stage'

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    company: text('company').notNull(),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    industry: text('industry'),
    stage: text('stage').notNull().default('new'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    teamId: uuid('team_id'),
    lastVisitAt: timestamp('last_visit_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customers_owner_id_idx').on(t.ownerId),
    index('customers_stage_idx').on(t.stage),
    index('customers_owner_stage_idx').on(t.ownerId, t.stage),
    check(
      'customers_stage_check',
      sql.raw(`stage IN (${CUSTOMER_STAGES.map((s) => `'${s}'`).join(',')})`),
    ),
  ],
)

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
