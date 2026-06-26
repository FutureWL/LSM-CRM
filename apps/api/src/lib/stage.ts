// 必须与 src/lib/stage.ts 一致
export const CUSTOMER_STAGES = [
  'new',
  'contacted',
  'intent',
  'negotiating',
  'won',
  'lost',
] as const

export type CustomerStage = (typeof CUSTOMER_STAGES)[number]

export const STAGE_LABEL: Record<CustomerStage, string> = {
  new: '新客户',
  contacted: '已联系',
  intent: '有意向',
  negotiating: '商务谈判',
  won: '已成交',
  lost: '已流失',
}

export const VISIT_TYPES = ['normal', 'collection', 'warranty', 'introduction'] as const
export type VisitType = (typeof VISIT_TYPES)[number]

export const VISIT_RESULTS = ['progress', 'obstacle', 'done'] as const
export type VisitResult = (typeof VISIT_RESULTS)[number]

export const USER_ROLES = ['admin', 'sales'] as const
export type UserRole = (typeof USER_ROLES)[number]
