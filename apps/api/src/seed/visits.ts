import { faker } from '@faker-js/faker/locale/zh_CN'
import { db } from '../db/client'
import { visits, customers } from '../db/schema'

const PER_CUSTOMER = { min: 2, max: 6 }

const TYPES = ['normal', 'collection', 'warranty', 'introduction'] as const
const RESULTS = ['progress', 'obstacle', 'done'] as const
const STAGES = ['new', 'contacted', 'intent', 'negotiating', 'won', 'lost'] as const

const TEMPLATES = {
  content: [
    '客户对产品功能认可，约下周再访。',
    '已发送报价单，等待对方内部审批。',
    '客户提出价格异议，需要主管协助。',
    '今天带样品给客户看，反馈良好。',
    '客户表示预算紧张，提议分期付款。',
    '确认签约时间，下周三签合同。',
    '客户暂时不需要，半年后再联系。',
  ],
  nextStep: [
    '下周再次拜访',
    '发送详细方案',
    '电话跟进',
    '等对方反馈',
    '安排技术对接',
  ],
}

export async function seedVisits(): Promise<number> {
  faker.seed(456)

  const allCustomers = await db
    .select({ id: customers.id, ownerId: customers.ownerId })
    .from(customers)
  if (allCustomers.length === 0) throw new Error('Run seed customers first')

  await db.delete(visits)

  const allRows: Array<typeof visits.$inferInsert> = []
  for (const cust of allCustomers) {
    const n = faker.number.int(PER_CUSTOMER)
    for (let i = 0; i < n; i++) {
      const visitedAt = faker.date.recent({ days: 60 })
      const stageBefore = faker.helpers.arrayElement(STAGES)
      const stageAfter = faker.helpers.arrayElement(STAGES)
      allRows.push({
        customerId: cust.id,
        salesmanId: cust.ownerId,
        type: faker.helpers.arrayElement(TYPES),
        result: faker.helpers.arrayElement(RESULTS),
        content: faker.helpers.arrayElement(TEMPLATES.content),
        durationMin: faker.number.int({ min: 15, max: 120 }),
        nextStep: faker.helpers.arrayElement(TEMPLATES.nextStep),
        stageBefore,
        stageAfter,
        visitedAt,
      })
    }
  }

  const BATCH = 100
  for (let i = 0; i < allRows.length; i += BATCH) {
    await db.insert(visits).values(allRows.slice(i, i + BATCH))
  }
  return allRows.length
}
