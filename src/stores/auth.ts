import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User, UserRole } from '@/types'
import { useUsersStore } from './users'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const currentUserId = ref<string | null>(null)
    const usersStore = useUsersStore()

    const currentUser = computed<User | null>(() => {
      if (!currentUserId.value) return null
      return usersStore.byId(currentUserId.value) ?? null
    })

    const isLoggedIn = computed(() => currentUser.value !== null)
    const role = computed<UserRole | null>(() => currentUser.value?.role ?? null)
    const isAdmin = computed(() => role.value === 'admin')
    const isSales = computed(() => role.value === 'sales')

    function login(userId: string) {
      if (!usersStore.byId(userId)) {
        throw new Error('用户不存在')
      }
      currentUserId.value = userId
    }

    function logout() {
      currentUserId.value = null
    }

    return { currentUserId, currentUser, isLoggedIn, role, isAdmin, isSales, login, logout }
  },
  { persist: true },
)
