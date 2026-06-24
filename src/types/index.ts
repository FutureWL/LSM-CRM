// 业务类型定义 - 全应用共享

export type UserRole = 'sales' | 'admin'

export interface User {
  id: string
  name: string
  role: UserRole
  avatar: string
  team?: string
  title?: string
}

// 客户阶段:new → contacted → intent → negotiating → won / lost
export type CustomerStage =
  | 'new'
  | 'contacted'
  | 'intent'
  | 'negotiating'
  | 'won'
  | 'lost'

export interface Customer {
  id: string
  name: string
  company: string
  contact: string
  phone: string
  email?: string
  stage: CustomerStage
  ownerId: string // 归属销售
  industry: string
  address?: string
  estimatedValue: number // 元
  remark?: string
  createdAt: string // ISO
  lastVisitAt?: string
  // 跟单转移记录
  transferredAt?: string
  transferredBy?: string
  transferNote?: string
  previousOwnerId?: string
  // 账款(已成交客户)
  paymentTermDays?: number // 账期天数
  amountDue?: number // 当前未收金额
  dueDate?: string // 应收日期
  // 质保期(已成交客户)
  warrantyStartAt?: string
  warrantyMonths?: number
  // 商机预测(已成交客户)
  predictedNextValue?: number
  predictedProduct?: string
  predictedAt?: string
}

// 拜访结果
export type VisitResult = 'progress' | 'obstacle' | 'done'

// 拜访类型:普通 / 催款 / 质保回访 / 商机介绍
export type VisitType = 'normal' | 'collection' | 'warranty' | 'introduction'

export interface Visit {
  id: string
  customerId: string
  salesId: string
  visitedAt: string // ISO
  duration: number // 分钟
  content: string
  result: VisitResult
  visitType?: VisitType
  nextFollowUpAt?: string
  nextStep?: string
  createdAt: string
}
