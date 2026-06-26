// 鉴权 store - 后端真会话版本
//
// 持久化只存 currentUserId（页面刷新时复用，避免立即跳登录页）；
// 实际登录态由 cookie 决定，路由守卫会调 fetchMe() 二次验证。

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '@/types'
import { AuthApi, UsersApi } from '@/api'
import { storageKey } from '@/config/storage-keys'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const currentUserId = ref<string | null>(null)
    const currentUser = ref<User | null>(null)
    const loading = ref(false)
    const lastError = ref<string | null>(null)

    const isLoggedIn = computed(() => currentUser.value !== null)
    const role = computed(() => currentUser.value?.role ?? null)
    const isAdmin = computed(() => role.value === 'admin')
    const isSales = computed(() => role.value === 'sales')
    /**
     * 是否必须修改密码。
     * true 时：路由守卫会跳 /change-password 页面，用户无法访问其他任何路由。
     */
    const mustChangePassword = computed(() => currentUser.value?.mustChangePassword === true)

    async function login(email: string, password: string) {
      loading.value = true
      lastError.value = null
      try {
        const user = await AuthApi.login(email, password)
        currentUser.value = user
        currentUserId.value = user.id
      } catch (err) {
        lastError.value = err instanceof Error ? err.message : '登录失败'
        throw err
      } finally {
        loading.value = false
      }
    }

    async function logout() {
      loading.value = true
      try {
        await AuthApi.logout()
      } finally {
        clear()
      }
    }

    function clear() {
      currentUser.value = null
      currentUserId.value = null
    }

    /** 页面加载/路由守卫时调用：拿 cookie 验真身 */
    async function bootstrap() {
      if (currentUser.value) return currentUser.value
      const u = await AuthApi.fetchMe()
      if (u) {
        currentUser.value = u
        currentUserId.value = u.id
      }
      return u
    }

    /** 修改自己的密码（带当前密码校验） */
    async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
      if (!currentUser.value) throw new Error('未登录')
      loading.value = true
      lastError.value = null
      try {
        await UsersApi.updateUser(currentUser.value.id, { currentPassword, password: newPassword })
      } catch (err) {
        lastError.value = err instanceof Error ? err.message : '修改密码失败'
        throw err
      } finally {
        loading.value = false
      }
    }

    /**
     * 修改密码（专用接口 /auth/change-password）
     * - 主动修改：传 currentPassword
     * - 强制改密（首登/重置）：不传 currentPassword
     * 成功后本地 currentUser.mustChangePassword 置 false，无需重新拉 user
     */
    async function changePassword(newPassword: string, currentPassword?: string): Promise<void> {
      if (!currentUser.value) throw new Error('未登录')
      loading.value = true
      lastError.value = null
      try {
        const { AuthApi } = await import('@/api')
        await AuthApi.changePassword(newPassword, currentPassword)
        // 本地更新 mustChangePassword 标志
        if (currentUser.value) {
          currentUser.value = { ...currentUser.value, mustChangePassword: false }
        }
      } catch (err) {
        lastError.value = err instanceof Error ? err.message : '修改密码失败'
        throw err
      } finally {
        loading.value = false
      }
    }

    return {
      currentUserId,
      currentUser,
      loading,
      lastError,
      isLoggedIn,
      role,
      isAdmin,
      isSales,
      mustChangePassword,
      login,
      logout,
      clear,
      bootstrap,
      changeOwnPassword,
      changePassword,
    }
  },
  {
    // 只持久化 userId，user 对象每次启动从后端重新拿
    persist: {
      key: storageKey.auth,
      pick: ['currentUserId'],
    },
  },
)