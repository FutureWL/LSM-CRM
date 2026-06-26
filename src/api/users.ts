// 用户管理 API（管理员）

import { api } from './http'
import type { UserDto } from './dto'
import { dtoToUser } from './mappers'
import type { User } from '@/types'

export async function listUsers(includeInactive = false): Promise<User[]> {
  const dtos = await api.get<UserDto[]>('/users', { query: { includeInactive: includeInactive ? 1 : 0 } })
  return dtos.map(dtoToUser)
}

export async function listSalesUsers(): Promise<User[]> {
  const dtos = await api.get<UserDto[]>('/users/sales')
  return dtos.map(dtoToUser)
}

export async function getUser(id: string): Promise<User> {
  const dto = await api.get<UserDto>(`/users/${id}`)
  return dtoToUser(dto)
}

export interface CreateUserInput {
  email: string
  name: string
  role: 'sales' | 'admin'
  password: string
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const dto = await api.post<UserDto>('/users', input)
  return dtoToUser(dto)
}

export interface UpdateUserInput {
  // 管理员改任意用户
  name?: string
  email?: string
  role?: 'sales' | 'admin'
  isActive?: boolean
  password?: string
  // 自己改密码时必填
  currentPassword?: string
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const dto = await api.patch<UserDto>(`/users/${id}`, input)
  return dtoToUser(dto)
}

export async function deactivateUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}