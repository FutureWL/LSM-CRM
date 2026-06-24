import { faker } from '@faker-js/faker/locale/zh_CN'
import type { Customer, CustomerStage, User } from '@/types'
import { daysAgo } from '@/lib/format'
import dayjs from 'dayjs'

faker.seed(123)

const INDUSTRIES = ['互联网', '金融', '制造', '教育', '医疗', '零售', '物流', '地产']
const COMPANY_SUFFIX = ['科技', '信息', '实业', '集团', '股份', '控股', '商行', '电子']

const STAGE_DIST: CustomerStage[] = [
  // 80 客户分布
  ...Array(15).fill('new'),
  ...Array(18).fill('contacted'),
  ...Array(20).fill('intent'),
  ...Array(15).fill('negotiating'),
  ...Array(8).fill('won'),
  ...Array(4).fill('lost'),
]

export function buildSeedCustomers(sales: User[]): Customer[] {
  const salesIds = sales.filter((u) => u.role === 'sales').map((u) => u.id)
  const adminIds = sales.filter((u) => u.role === 'admin').map((u) => u.id)
  const list: Customer[] = STAGE_DIST.map((stage, i) => {
    const company =
      faker.company.name().slice(0, 4) +
      COMPANY_SUFFIX[faker.number.int({ min: 0, max: COMPANY_SUFFIX.length - 1 })]
    const contact = faker.person.lastName() + faker.person.firstName().slice(0, 1)
    const createdDaysAgo = faker.number.int({ min: 1, max: 90 })
    return {
      id: `c_${String(i + 1).padStart(3, '0')}`,
      name: contact,
      company,
      contact,
      phone: faker.phone.number(),
      email: faker.internet.email(),
      stage,
      ownerId: salesIds[i % salesIds.length],
      industry: INDUSTRIES[i % INDUSTRIES.length],
      address: faker.location.city() + '市' + faker.location.streetAddress(),
      estimatedValue: faker.number.int({ min: 5000, max: 500000 }),
      remark: faker.lorem.sentence({ min: 6, max: 14 }),
      createdAt: daysAgo(createdDaysAgo),
      lastVisitAt: faker.datatype.boolean(0.7)
        ? daysAgo(faker.number.int({ min: 0, max: Math.min(createdDaysAgo, 20) }))
        : undefined,
    }
  })

  // 演示用:为前 3 个客户加上「跟单转移」历史,展示转移记录
  if (list.length >= 3 && adminIds.length > 0) {
    list[0].previousOwnerId = salesIds[0]
    list[0].ownerId = salesIds[1]
    list[0].transferredAt = daysAgo(3)
    list[0].transferredBy = adminIds[0]
    list[0].transferNote = '原销售已转岗,由新同事继续跟进'

    list[1].previousOwnerId = salesIds[1]
    list[1].ownerId = salesIds[2]
    list[1].transferredAt = daysAgo(7)
    list[1].transferredBy = adminIds[0]
    list[1].transferNote = '行业经验更匹配,调整分配'

    list[2].previousOwnerId = salesIds[3]
    list[2].ownerId = salesIds[0]
    list[2].transferredAt = daysAgo(12)
    list[2].transferredBy = adminIds[adminIds.length - 1]
  }

  // 演示用:为已成交客户(8 个)补齐账期 / 质保 / 商机预测数据
  const wonStart = STAGE_DIST.findIndex((s) => s === 'won')
  const wonList = list.slice(wonStart, wonStart + 8)
  const termDays = [30, 45, 60]
  wonList.forEach((c, idx) => {
    // 账款
    if (idx < 6) {
      c.paymentTermDays = termDays[idx % termDays.length]
      const fullAmount = c.estimatedValue
      const paidRatio = idx === 0 || idx === 3 ? 0 : idx === 1 ? 0.5 : 0.3
      c.amountDue = Math.round(fullAmount * (1 - paidRatio))
      if (c.amountDue > 0) {
        const daysFromNow = [-5, -2, 3, 7, 12, 20][idx]
        c.dueDate = dayjs().add(daysFromNow, 'day').toISOString()
      }
    }
    // 质保期
    if (idx >= 2 && idx < 7) {
      const monthsAgo = [10, 8, 5, 2, 1][idx - 2] ?? 6
      c.warrantyStartAt = dayjs().subtract(monthsAgo, 'month').toISOString()
      c.warrantyMonths = 12
    }
    // 商机预测
    if (idx % 2 === 0) {
      c.predictedProduct = ['企业版升级', '二期扩容', '增值模块', '续约'][idx / 2 | 0] ?? '续约'
      c.predictedNextValue = Math.round(c.estimatedValue * (0.6 + 0.2 * (idx % 3)))
      c.predictedAt = dayjs().subtract(idx, 'day').toISOString()
    }
  })

  return list
}
