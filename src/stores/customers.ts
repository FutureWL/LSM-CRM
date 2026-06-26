// 客户 store - 后端真数据
//
// 设计：
// - list 调 HTTP 加载
// - update/setStage/transferOwner 调 HTTP，本地同步
// - demo 专属方法（账款/质保/预测）保留签名 no-op，
//   避免 UI 报错；后续 v0.5 补后端表
// - touchLastVisit 由 visits.add 后端自动处理，前端无需手动调

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import type { Customer, CustomerStage } from '@/types'
import { CustomersApi, type CustomerCreateInput } from '@/api'
import { storageKey } from '@/config/storage-keys'

export const useCustomersStore = defineStore(
  'customers',
  () => {
    const list = ref<Customer[]>([])
    const loading = ref(false)
    const lastError = ref<string | null>(null)
    const loaded = ref(false)

    function byId(id: string): Customer | undefined {
      return list.value.find((c) => c.id === id)
    }

    function byOwner(ownerId: string): Customer[] {
      return list.value.filter((c) => c.ownerId === ownerId)
    }

    function byStage(stage: CustomerStage): Customer[] {
      return list.value.filter((c) => c.stage === stage)
    }

    async function load(force = false) {
      if (loaded.value && !force) return
      loading.value = true
      lastError.value = null
      try {
        const res = await CustomersApi.listCustomers({ limit: 200 })
        list.value = res.items
        loaded.value = true
      } catch (err) {
        lastError.value = err instanceof Error ? err.message : '加载客户失败'
      } finally {
        loading.value = false
      }
    }

    async function create(input: CustomerCreateInput): Promise<Customer> {
      const c = await CustomersApi.createCustomer(input)
      list.value = [...list.value, c]
      return c
    }

    async function update(id: string, patch: Partial<Customer>) {
      const dto = await CustomersApi.updateCustomer(id, patch)
      const idx = list.value.findIndex((c) => c.id === id)
      if (idx >= 0) list.value[idx] = dto
      return dto
    }

    async function setStage(id: string, stage: CustomerStage) {
      return update(id, { stage })
    }

    /** 拜访写入后端时已自动更新 customer.lastVisitAt，这里只做本地同步兜底 */
    async function touchLastVisit(customerId: string) {
      const c = byId(customerId)
      if (!c) return
      c.lastVisitAt = dayjs().toISOString()
    }

    async function transferOwner(
      customerId: string,
      newOwnerId: string,
      _operatorId: string,
      note?: string,
    ) {
      const dto = await CustomersApi.transferCustomer(customerId, {
        toUserId: newOwnerId,
        reason: note,
      })
      const idx = list.value.findIndex((c) => c.id === customerId)
      if (idx >= 0) list.value[idx] = dto
      return dto
    }

    // === Demo 专属方法（保留签名，no-op，等待 v0.5 后端表） ===
    function _demoOnly(_name: string) {
      // eslint-disable-next-line no-console
      console.warn(`[customers] demo-only method "${_name}" not yet wired to backend`)
    }
    function markInvoiced(_customerId: string, _amount: number, _termDays: number) {
      _demoOnly('markInvoiced')
    }
    function recordCollection(_customerId: string, _amount: number) {
      _demoOnly('recordCollection')
    }
    function setWarranty(_customerId: string, _startAt: string, _months: number) {
      _demoOnly('setWarranty')
    }
    function setPrediction(_customerId: string, _product: string, _value: number) {
      _demoOnly('setPrediction')
    }
    function clearPrediction(_customerId: string) {
      _demoOnly('clearPrediction')
    }

    // === Demo 派生 computed（后端暂无数据，全部返回空） ===
    const dueSoonList = computed<Customer[]>(() => [])
    const overdueList = computed<Customer[]>(() => [])
    const totalAmountDue = computed(() => 0)
    const overdueAmount = computed(() => 0)
    const inWarrantyList = computed<Customer[]>(() => [])
    const expiringWarrantyList = computed<Customer[]>(() => [])
    const forecastList = computed<Customer[]>(() => [])
    const forecastValue = computed(() => 0)
    function warrantyEndAt(_c: Customer): string | undefined {
      return undefined
    }

    // === 真实统计 ===
    const total = computed(() => list.value.length)
    const newThisMonth = computed(
      () =>
        list.value.filter((c) => dayjs(c.createdAt).isSame(dayjs(), 'month')).length,
    )
    const wonCount = computed(() => list.value.filter((c) => c.stage === 'won').length)
    const wonRate = computed(() =>
      total.value === 0 ? 0 : Math.round((wonCount.value / total.value) * 100),
    )

    return {
      list,
      loading,
      lastError,
      loaded,
      byId,
      byOwner,
      byStage,
      load,
      create,
      update,
      setStage,
      touchLastVisit,
      transferOwner,
      // demo 兼容
      markInvoiced,
      recordCollection,
      setWarranty,
      setPrediction,
      clearPrediction,
      dueSoonList,
      overdueList,
      totalAmountDue,
      overdueAmount,
      inWarrantyList,
      expiringWarrantyList,
      forecastList,
      forecastValue,
      warrantyEndAt,
      total,
      newThisMonth,
      wonCount,
      wonRate,
    }
  },
  { persist: { key: storageKey.customers } },
)