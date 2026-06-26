import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { customers } from './customers'

export const customerTransfers = pgTable('customer_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
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
})

export type CustomerTransfer = typeof customerTransfers.$inferSelect
export type NewCustomerTransfer = typeof customerTransfers.$inferInsert
