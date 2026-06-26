// DTO -> 领域模型 映射
//
// 前端 src/types/index.ts 是 demo 时期的领域模型，包含 demo 专属字段
// （账款、质保、预测等）。后端 DTO 是真实业务数据。
// 这里把 DTO 投影成前端可消费的形态：
//   - 后端有但前端没有的字段：丢弃
//   - 前端有但后端没有的字段：用合理默认值（保持 UI 不崩）
//   - 字段重命名（如 amount -> estimatedValue）：在 mapper 中处理
//
// 这样改动最小：view 层不动，store 层接口不变。

import type { User, Customer, Visit, CustomerStage, VisitResult, VisitType } from '@/types'
import type {
  UserDto,
  CustomerDto,
  VisitDto,
  VisitWithSalesmanDto,
  CustomerStage as StageDto,
  VisitResult as ResultDto,
  VisitType as TypeDto,
} from './dto'

// 从姓名生成头像 URL（前端演示版行为：DiceBear）
function avatarFromName(name: string): string {
  const seed = encodeURIComponent(name || 'user')
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`
}

export function dtoToUser(dto: UserDto): User {
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role,
    avatar: dto.avatarUrl ?? avatarFromName(dto.name),
    title: dto.role === 'admin' ? '管理员' : '销售',
    mustChangePassword: dto.mustChangePassword,
  }
}

export function dtoToCustomer(dto: CustomerDto): Customer {
  return {
    id: dto.id,
    name: dto.name,
    company: dto.company,
    contact: dto.name, // 后端无独立 contact 字段，用 name 兜底
    phone: dto.phone ?? '',
    email: dto.email ?? undefined,
    stage: dto.stage as CustomerStage,
    ownerId: dto.ownerId,
    industry: dto.industry ?? '',
    address: dto.address ?? undefined,
    estimatedValue: dto.amount,
    remark: undefined,
    createdAt: dto.createdAt,
    lastVisitAt: dto.lastVisitAt ?? undefined,
    // demo 专属字段 - 后端暂无，给空
    paymentTermDays: undefined,
    amountDue: undefined,
    dueDate: undefined,
    warrantyStartAt: undefined,
    warrantyMonths: undefined,
    predictedNextValue: undefined,
    predictedProduct: undefined,
    predictedAt: undefined,
  }
}

export function dtoToVisit(dto: VisitDto | VisitWithSalesmanDto): Visit {
  return {
    id: dto.id,
    customerId: dto.customerId,
    salesId: 'salesmanId' in dto ? dto.salesmanId : '',
    visitedAt: dto.visitedAt,
    duration: dto.durationMin ?? 0,
    content: dto.content,
    result: dto.result as VisitResult,
    visitType: (dto.type as VisitType) ?? 'normal',
    nextFollowUpAt: undefined,
    nextStep: 'nextStep' in dto ? (dto.nextStep ?? undefined) : undefined,
    createdAt: dto.createdAt,
  }
}

// --- 入参：领域模型 -> DTO ---

export interface CustomerCreateInput {
  name: string
  company: string
  phone?: string
  email?: string
  address?: string
  industry?: string
  stage?: CustomerStage
  amount?: number
  ownerId?: string
}

export function customerCreateToDto(input: CustomerCreateInput) {
  return {
    name: input.name,
    company: input.company,
    phone: input.phone || undefined,
    email: input.email || undefined,
    address: input.address || undefined,
    industry: input.industry || undefined,
    stage: input.stage,
    amount: input.amount ?? 0,
    ownerId: input.ownerId,
  }
}

export function customerPatchToDto(patch: Partial<Customer>) {
  const out: Record<string, unknown> = {}
  if (patch.name !== undefined) out.name = patch.name
  if (patch.company !== undefined) out.company = patch.company
  if (patch.phone !== undefined) out.phone = patch.phone || null
  if (patch.email !== undefined) out.email = patch.email || null
  if (patch.address !== undefined) out.address = patch.address || null
  if (patch.industry !== undefined) out.industry = patch.industry || null
  if (patch.stage !== undefined) out.stage = patch.stage
  if (patch.estimatedValue !== undefined) out.amount = patch.estimatedValue
  return out
}

export interface VisitCreateInput {
  customerId: string
  type?: VisitType
  result: VisitResult
  content: string
  durationMin?: number
  nextStep?: string
  stageBefore?: CustomerStage
  stageAfter?: CustomerStage
  visitedAt?: string
}

export function visitCreateToDto(input: VisitCreateInput) {
  return {
    customerId: input.customerId,
    type: input.type ?? 'normal',
    result: input.result,
    content: input.content,
    durationMin: input.durationMin,
    nextStep: input.nextStep,
    stageBefore: input.stageBefore,
    stageAfter: input.stageAfter,
    visitedAt: input.visitedAt,
  }
}

// 类型对齐：前端 enum 和后端 enum 当前一致，这里做个 re-export 桥
export type { StageDto, ResultDto, TypeDto }