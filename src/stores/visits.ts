import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Visit } from '@/types'
import { buildSeed } from '@/seed'
import dayjs from 'dayjs'
import { useCustomersStore } from './customers'

let _visitId = 10000
function nextId(): string {
  return `v_new_${++_visitId}`
}

export const useVisitsStore = defineStore(
  'visits',
  () => {
    const seed = buildSeed()
    const list = ref<Visit[]>(seed.visits)

    function byId(id: string): Visit | undefined {
      return list.value.find((v) => v.id === id)
    }

    function byCustomer(customerId: string): Visit[] {
      return list.value
        .filter((v) => v.customerId === customerId)
        .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
    }

    function bySales(salesId: string): Visit[] {
      return list.value
        .filter((v) => v.salesId === salesId)
        .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
    }

    function add(input: Omit<Visit, 'id' | 'createdAt'>): Visit {
      const visit: Visit = {
        ...input,
        id: nextId(),
        createdAt: dayjs().toISOString(),
      }
      list.value.unshift(visit)
      // 联动:更新客户的 lastVisitAt
      const customers = useCustomersStore()
      customers.touchLastVisit(visit.customerId)
      return visit
    }

    function remove(id: string) {
      const idx = list.value.findIndex((v) => v.id === id)
      if (idx >= 0) list.value.splice(idx, 1)
    }

    // 统计
    const total = computed(() => list.value.length)
    const thisMonth = computed(
      () =>
        list.value.filter((v) => dayjs(v.visitedAt).isSame(dayjs(), 'month')).length,
    )
    const today = computed(
      () => list.value.filter((v) => dayjs(v.visitedAt).isSame(dayjs(), 'day')).length,
    )

    return { list, byId, byCustomer, bySales, add, remove, total, thisMonth, today }
  },
  { persist: { key: 'lsm-crm-visits' } },
)
