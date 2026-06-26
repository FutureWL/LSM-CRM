// 拜访 store - 后端真数据
//
// 设计：
// - list 调 HTTP 加载
// - add() 调 createVisit，后端会同步更新 customer.lastVisitAt
// - remove() 调 deleteVisit（软删除）
// - 统计 computed 基于 list 派生

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import type { Visit } from '@/types'
import { VisitsApi, type VisitCreateInput } from '@/api'
import { storageKey } from '@/config/storage-keys'

export const useVisitsStore = defineStore(
  'visits',
  () => {
    const list = ref<Visit[]>([])
    const loading = ref(false)
    const lastError = ref<string | null>(null)
    const loaded = ref(false)

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

    async function load(force = false, params?: { customerId?: string; salesmanId?: string }) {
      if (loaded.value && !force && !params) return
      loading.value = true
      lastError.value = null
      try {
        const res = await VisitsApi.listVisits(params)
        // 如果有 params（如 byCustomer），不覆盖全集；如果没有则覆盖
        if (!params) {
          list.value = res.items
          loaded.value = true
        } else if (params.customerId) {
          // 合并：移除该 customerId 的旧记录，再插入新拉到的
          list.value = [
            ...res.items,
            ...list.value.filter((v) => v.customerId !== params.customerId),
          ]
        } else {
          list.value = res.items
        }
      } catch (err) {
        lastError.value = err instanceof Error ? err.message : '加载拜访失败'
      } finally {
        loading.value = false
      }
    }

    async function add(input: Omit<VisitCreateInput, never>): Promise<Visit> {
      const v = await VisitsApi.createVisit(input)
      list.value = [v, ...list.value]
      return v
    }

    async function remove(id: string) {
      await VisitsApi.deleteVisit(id)
      list.value = list.value.filter((v) => v.id !== id)
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

    return {
      list,
      loading,
      lastError,
      loaded,
      byId,
      byCustomer,
      bySales,
      load,
      add,
      remove,
      total,
      thisMonth,
      today,
    }
  },
  { persist: { key: storageKey.visits } },
)