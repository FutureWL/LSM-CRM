import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import { buildSeed } from '@/seed'

export const useUsersStore = defineStore(
  'users',
  () => {
    const seed = buildSeed()
    const list = ref<User[]>(seed.users)

    function byId(id: string): User | undefined {
      return list.value.find((u) => u.id === id)
    }

    const sales = () => list.value.filter((u) => u.role === 'sales')
    const admins = () => list.value.filter((u) => u.role === 'admin')

    return { list, byId, sales, admins }
  },
  { persist: { key: 'lsm-crm-users' } },
)
