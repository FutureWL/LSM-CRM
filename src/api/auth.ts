// 鉴权相关 API

import { api } from './http'
import type { AuthUserDto } from './dto'
import { dtoToUser } from './mappers'
import type { User } from '@/types'

export async function login(email: string, password: string): Promise<User> {
  const dto = await api.post<AuthUserDto>('/auth/login', { email, password })
  return dtoToUser({ ...dto, isActive: true, createdAt: '' })
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {})
  } catch {
    // 即使后端 logout 失败，本地清登录态即可
  }
}

export async function fetchMe(): Promise<User | null> {
  try {
    const dto = await api.get<AuthUserDto>('/auth/me', { skipAuthRedirect: true })
    return dtoToUser({ ...dto, isActive: true, createdAt: '' })
  } catch {
    return null
  }
}

/**
 * 修改自己的密码。
 * - 主动修改：传 currentPassword + newPassword
 * - 强制改密（首登/重置）：只传 newPassword
 */
export async function changePassword(
  newPassword: string,
  currentPassword?: string,
): Promise<void> {
  await api.post('/auth/change-password', {
    newPassword,
    ...(currentPassword ? { currentPassword } : {}),
  })
}