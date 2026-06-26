import { faker } from '@faker-js/faker/locale/zh_CN'
import { db } from '../db/client'
import { customers, users } from '../db/schema'
import { sql } from 'drizzle-orm'
import { DEFAULT_TENANT_ID } from '../lib/tenant-constants'

const TARGET = 80
const STAGE_DIST: Array<{ stage: string; n: number }> = [
  { stage: 'new', n: 30 },
  { stage: 'contacted', n: 20 },
  { stage: 'intent', n: 12 },
  { stage: 'negotiating', n: 8 },
  { stage: 'won', n: 6 },
  { stage: 'lost', n: 4 },
]

export async function seedCustomers(): Promise<number> {
  faker.seed(123)

  const salesUsers = await db.select({ id: users.id }).from(users).where(sql`role = 'sales'`)
  if (salesUsers.length === 0) throw new Error('Run seed users first')

  await db.delete(customers)

  const total = STAGE_DIST.reduce((a, b) => a + b.n, 0)
  if (total !== TARGET) throw new Error(`STAGE_DIST sum ${total} != ${TARGET}`)

  const rows: Array<typeof customers.$inferInsert> = []
  for (const { stage, n } of STAGE_DIST) {
    for (let i = 0; i < n; i++) {
      const owner = salesUsers[faker.number.int({ min: 0, max: salesUsers.length - 1 })]!
      const company = faker.company.name()
      rows.push({
        tenantId: DEFAULT_TENANT_ID,
        name: faker.person.lastName() + faker.person.firstName().charAt(0),
        company,
        phone: faker.phone.number({ style: 'national' }),
        email: faker.internet.email().toLowerCase(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        industry: faker.commerce.department(),
        stage,
        amount: faker.number.int({ min: 10000, max: 800000 }).toString(),
        ownerId: owner.id,
        lastVisitAt: stage === 'won' || stage === 'lost' ? faker.date.recent({ days: 60 }) : null,
      })
    }
  }

  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(customers).values(rows.slice(i, i + BATCH))
  }
  return rows.length
}
