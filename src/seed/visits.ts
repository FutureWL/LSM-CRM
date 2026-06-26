import { faker } from '@faker-js/faker/locale/zh_CN'
import type { Customer, Visit, VisitResult, VisitType } from '@/types'
import { daysAgo } from '@/lib/format'

faker.seed(456)

const VISIT_CONTENTS = [
  '首次拜访,介绍公司产品和方案,客户表现出兴趣,约下次详细沟通。',
  '跟进上次沟通,演示技术方案细节,客户对核心功能认可,要求提供报价。',
  '客户内部已立项,讨论商务条款与实施周期,推进 POC 测试。',
  '现场支持,解决客户使用中的问题,反馈良好,正在推进采购流程。',
  '高层会面,双方达成战略合作意向,等待法务审核合同。',
  '客户预算紧张,本次重点沟通降本方案,客户认可,后续跟进。',
  '竞品对比演示,客户对我方技术领先性给予肯定,要求进一步对比报告。',
  '节日问候维护,顺带沟通了产品反馈,客户提出 2 个改进建议。',
  '签约前最后一轮法务/财务确认,合同细节基本敲定。',
  '项目交付,客户验收通过,探讨二期合作方向。',
]

const COLLECTION_CONTENTS = [
  '电话沟通本期应收款,客户回复本月排款中,月底前安排。',
  '上门催收,客户反馈正在走内部审批,预计 3 个工作日内付款。',
  '已发催款函,客户财务确认下周到账,持续跟进。',
  '客户提出分期付款诉求,内部沟通后同意 60 天账期延展。',
]

const WARRANTY_CONTENTS = [
  '上门回访,系统运行稳定,客户对服务质量表示满意。',
  '质保期内问题修复,客户反馈响应速度很快,值得续约。',
  '季度巡检完成,无异常,客户提出增加新功能模块。',
  '质保期临近,主动沟通续保方案,客户表示有意向。',
]

const INTRODUCTION_CONTENTS = [
  '基于现有合作,介绍企业版升级方案,客户表现浓厚兴趣。',
  '推荐配套的增值模块,客户现场了解后约下次详细沟通。',
  '探讨二期合作方向,客户内部已立项,跟进预算审批。',
  '介绍同行业标杆案例,客户决策人安排月底前再碰一次。',
]

const NEXT_STEPS = [
  '下周安排技术对接',
  '整理报价方案发客户',
  '准备 POC 测试环境',
  '提交合同终稿',
  '协调资源启动实施',
  '等客户内部决策',
  '下周再次拜访',
  '保持电话沟通',
]

const RESULTS: VisitResult[] = ['progress', 'progress', 'progress', 'obstacle', 'done']

export function buildSeedVisits(customers: Customer[]): Visit[] {
  const visits: Visit[] = []
  let id = 1

  for (const c of customers) {
    // 每个客户 2-6 条拜访,过去 60 天内
    const count = faker.number.int({ min: 2, max: 6 })
    for (let i = 0; i < count; i++) {
      const dayOffset = faker.number.int({ min: 0, max: 60 })
      // 已成交客户最近一次可能是催款/质保/商机
      let visitType: VisitType = 'normal'
      let content = faker.helpers.arrayElement(VISIT_CONTENTS)
      if (c.stage === 'won' && i === 0) {
        if (c.amountDue && c.amountDue > 0) {
          visitType = 'collection'
          content = faker.helpers.arrayElement(COLLECTION_CONTENTS)
        } else if (c.warrantyStartAt) {
          visitType = 'warranty'
          content = faker.helpers.arrayElement(WARRANTY_CONTENTS)
        } else if (c.predictedNextValue) {
          visitType = 'introduction'
          content = faker.helpers.arrayElement(INTRODUCTION_CONTENTS)
        }
      }
      visits.push({
        id: `v_${String(id++).padStart(4, '0')}`,
        customerId: c.id,
        salesId: c.ownerId,
        visitedAt: daysAgo(dayOffset),
        duration: faker.number.int({ min: 20, max: 180 }),
        content,
        result: faker.helpers.arrayElement(RESULTS),
        visitType,
        nextFollowUpAt: faker.datatype.boolean(0.6)
          ? daysAgo(-faker.number.int({ min: 1, max: 14 }))
          : undefined,
        nextStep: faker.helpers.arrayElement(NEXT_STEPS),
        createdAt: daysAgo(dayOffset),
      })
    }
  }

  return visits.sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  )
}
