// 后端 DTO 类型 - 与 apps/api/src/routes/*.ts 中的 toXxxDto 对齐
// 每次后端改 DTO 这里要同步改；后续可考虑 OpenAPI 自动生成

export type UserRole = 'sales' | 'admin'

export interface UserDto {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
  /** 是否必须修改密码（首登 / 管理员重置后） */
  mustChangePassword: boolean
}

// 后端 UserDto 的精简版（用于 /auth/me 等只返回基本信息的场景）
export interface AuthUserDto {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string | null
  /** 是否必须修改密码（首登 / 管理员重置后） */
  mustChangePassword: boolean
}

export type CustomerStage =
  | 'new'
  | 'contacted'
  | 'intent'
  | 'negotiating'
  | 'won'
  | 'lost'

export interface CustomerDto {
  id: string
  name: string
  company: string
  phone: string | null
  email: string | null
  address: string | null
  industry: string | null
  stage: CustomerStage
  amount: number
  ownerId: string
  lastVisitAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CustomerWithVisitsDto extends CustomerDto {
  recentVisits: VisitDto[]
}

export interface PageResult<T> {
  items: T[]
  page: number
  limit: number
  total?: number
}

export type VisitType = 'normal' | 'collection' | 'warranty' | 'introduction'
export type VisitResult = 'progress' | 'obstacle' | 'done'

export interface VisitDto {
  id: string
  customerId: string
  salesmanId: string
  type: VisitType
  result: VisitResult
  content: string
  durationMin: number | null
  nextStep: string | null
  stageBefore: CustomerStage | null
  stageAfter: CustomerStage | null
  visitedAt: string
  createdAt: string
}

// 在 customer detail 中关联出来的 visits（带 salesmanName）
export interface VisitWithSalesmanDto {
  id: string
  customerId: string
  salesmanId: string
  salesmanName: string | null
  type: VisitType
  result: VisitResult
  content: string
  durationMin: number | null
  nextStep: string | null
  stageBefore: CustomerStage | null
  stageAfter: CustomerStage | null
  visitedAt: string
  createdAt: string
}