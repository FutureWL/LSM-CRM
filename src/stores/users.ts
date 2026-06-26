// 用户 store - 从后端加载
//
// 设计：
// - list 一次性加载（7-100 人量级，没必要分页）
// - bootstrap() 由路由守卫在进入管理后台前调用
// - CRUD 全部调 HTTP，本地缓存更新

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import { UsersApi } from '@/api'
import type { CreateUserInput, UpdateUserInput } from '@/api/users'
import { storageKey } from '@/config/storage-keys'

export const useUsersStore = defineStore(
  'users',
  () => {
    const list = ref<User[]>([])
    const loading = ref(false)
    const lastError = ref<string | null>(null)
    const loaded = ref(false)

    function byId(id: string): User | undefined {
      return list.value.find((u) => u.id === id)
    }
    // 函数形式保持原调用方式：users.sales() / users.admins()
    function sales(): User[] {
      return list.value.filter((u) => u.role === 'sales')
    }
    function admins(): User[] {
      return list.value.filter((u) => u.role === 'admin')
    }

    async function load(force = false) {
      if (loaded.value && !force) return
      loading.value = true
      lastError.value = null
      try {
        list.value = await UsersApi.listUsers()
        loaded.value = true
      } catch (err) {
        lastError.value = err instanceof Error ? err.message : '加载用户失败'
      } finally {
        loading.value = false
      }
    }

    async function create(input: CreateUserInput): Promise<User> {
      const u = await UsersApi.createUser(input)
      list.value = [...list.value, u].sort((a, b) => a.name.localeCompare(b.name))
      return u
    }

    async function update(id: string, patch: UpdateUserInput): Promise<User> {
      const u = await UsersApi.updateUser(id, patch)
      const idx = list.value.findIndex((x) => x.id === id)
      if (idx >= 0) list.value[idx] = u
      return u
    }

    async function deactivate(id: string) {
      await UsersApi.deactivateUser(id)
      // 从列表移除（保持前端视角"已停用=不可见"）
      list.value = list.value.filter((x) => x.id !== id)
    }

    return {
      list,
      loading,
      lastError,
      loaded,
      byId,
      sales,
      admins,
      load,
      create,
      update,
      deactivate,
    }
  },
  { persist: { key: storageKey.users } },
)