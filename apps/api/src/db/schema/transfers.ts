import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { customers } from './customers'
import { tenants } from './tenants'

export const customerTransfers = pgTable(
  'customer_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reason: text('reason'),
    transferredAt: timestamp('transferred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('customer_transfers_tenant_id_idx').on(t.tenantId)],
)

export type CustomerTransfer = typeof customerTransfers.$inferSelect
export type NewCustomerTransfer = typeof customerTransfers.$inferInsert
