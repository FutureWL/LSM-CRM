import type { CustomerStage } from '@/types'

// 客户阶段定义 - 全应用唯一来源
export const STAGES: { value: CustomerStage; label: string; color: string; bg: string }[] = [
  { value: 'new', label: '新客户', color: '#0ea5e9', bg: '#e0f2fe' },
  { value: 'contacted', label: '已联系', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'intent', label: '有意向', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'negotiating', label: '商务谈判', color: '#f97316', bg: '#ffedd5' },
  { value: 'won', label: '已成交', color: '#10b981', bg: '#d1fae5' },
  { value: 'lost', label: '已流失', color: '#94a3b8', bg: '#f1f5f9' },
]

export const STAGE_MAP = Object.fromEntries(
  STAGES.map((s) => [s.value, s]),
) as Record<CustomerStage, (typeof STAGES)[number]>

export function stageLabel(stage: CustomerStage): string {
  return STAGE_MAP[stage]?.label ?? stage
}

export function stageColor(stage: CustomerStage): string {
  return STAGE_MAP[stage]?.color ?? '#64748b'
}

export function stageBg(stage: CustomerStage): string {
  return STAGE_MAP[stage]?.bg ?? '#f1f5f9'
}

// 阶段漏斗顺序(排除已流失)
export const FUNNEL_STAGES: CustomerStage[] = [
  'new',
  'contacted',
  'intent',
  'negotiating',
  'won',
]
