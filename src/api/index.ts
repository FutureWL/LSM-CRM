// API 层桶形导出
// - 类型用顶层命名导出（import type { CreateUserInput } from '@/api'）
// - 函数 API 用命名空间导出（UsersApi.createUser(...)），
//   避免 4 个模块同名函数冲突

export * from './http'
export * from './dto'
export * from './mappers'

export * as AuthApi from './auth'
export * as UsersApi from './users'
export * as CustomersApi from './customers'
export * as VisitsApi from './visits'