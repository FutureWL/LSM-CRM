import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Customer, CustomerStage } from '@/types'
import { buildSeed } from '@/seed'
import dayjs from 'dayjs'

export const useCustomersStore = defineStore(
  'customers',
  () => {
    const seed = buildSeed()
    const list = ref<Customer[]>(seed.customers)

    function byId(id: string): Customer | undefined {
      return list.value.find((c) => c.id === id)
    }

    function byOwner(ownerId: string): Customer[] {
      return list.value.filter((c) => c.ownerId === ownerId)
    }

    function byStage(stage: CustomerStage): Customer[] {
      return list.value.filter((c) => c.stage === stage)
    }

    function update(id: string, patch: Partial<Customer>) {
      const c = byId(id)
      if (c) Object.assign(c, patch)
    }

    function setStage(id: string, stage: CustomerStage) {
      update(id, { stage })
    }

    function touchLastVisit(customerId: string) {
      const c = byId(customerId)
      if (c) c.lastVisitAt = dayjs().toISOString()
    }

    function transferOwner(
      customerId: string,
      newOwnerId: string,
      operatorId: string,
      note?: string,
    ) {
      const c = byId(customerId)
      if (!c) return
      if (c.ownerId === newOwnerId) return
      c.previousOwnerId = c.ownerId
      c.ownerId = newOwnerId
      c.transferredAt = dayjs().toISOString()
      c.transferredBy = operatorId
      c.transferNote = note
    }

    // === 账款 / 质保 / 商机预测 ===
    function markInvoiced(customerId: string, amount: number, termDays: number) {
      const c = byId(customerId)
      if (!c) return
      c.amountDue = (c.amountDue ?? 0) + amount
      c.paymentTermDays = termDays
      c.dueDate = dayjs().add(termDays, 'day').toISOString()
    }

    function recordCollection(customerId: string, amount: number) {
      const c = byId(customerId)
      if (!c) return
      c.amountDue = Math.max(0, (c.amountDue ?? 0) - amount)
      if (c.amountDue === 0) c.dueDate = undefined
    }

    function setWarranty(customerId: string, startAt: string, months: number) {
      const c = byId(customerId)
      if (!c) return
      c.warrantyStartAt = startAt
      c.warrantyMonths = months
    }

    function setPrediction(
      customerId: string,
      product: string,
      value: number,
    ) {
      const c = byId(customerId)
      if (!c) return
      c.predictedProduct = product
      c.predictedNextValue = value
      c.predictedAt = dayjs().toISOString()
    }

    function clearPrediction(customerId: string) {
      const c = byId(customerId)
      if (!c) return
      c.predictedProduct = undefined
      c.predictedNextValue = undefined
      c.predictedAt = undefined
    }

    // 账款状态
    const dueSoonList = computed(() =>
      list.value.filter(
        (c) =>
          c.amountDue &&
          c.amountDue > 0 &&
          c.dueDate &&
          dayjs(c.dueDate).diff(dayjs(), 'day') <= 7 &&
          dayjs(c.dueDate).isAfter(dayjs().subtract(1, 'day')),
      ),
    )
    const overdueList = computed(() =>
      list.value.filter(
        (c) => c.amountDue && c.amountDue > 0 && c.dueDate && dayjs(c.dueDate).isBefore(dayjs(), 'day'),
      ),
    )
    const totalAmountDue = computed(() =>
      list.value.reduce((s, c) => s + (c.amountDue ?? 0), 0),
    )
    const overdueAmount = computed(() =>
      overdueList.value.reduce((s, c) => s + (c.amountDue ?? 0), 0),
    )

    // 质保状态
    function warrantyEndAt(c: Customer): string | undefined {
      if (!c.warrantyStartAt || !c.warrantyMonths) return undefined
      return dayjs(c.warrantyStartAt).add(c.warrantyMonths, 'month').toISOString()
    }
    const inWarrantyList = computed(() =>
      list.value.filter((c) => {
        const end = warrantyEndAt(c)
        return end && dayjs(end).isAfter(dayjs())
      }),
    )
    const expiringWarrantyList = computed(() =>
      list.value.filter((c) => {
        const end = warrantyEndAt(c)
        if (!end) return false
        const days = dayjs(end).diff(dayjs(), 'day')
        return days >= 0 && days <= 30
      }),
    )

    // 商机预测
    const forecastList = computed(() =>
      list.value.filter((c) => c.predictedNextValue && c.predictedNextValue > 0),
    )
    const forecastValue = computed(() =>
      forecastList.value.reduce((s, c) => s + (c.predictedNextValue ?? 0), 0),
    )

    // 统计
    const total = computed(() => list.value.length)
    const newThisMonth = computed(
      () => list.value.filter((c) => dayjs(c.createdAt).isSame(dayjs(), 'month')).length,
    )
    const wonCount = computed(() => list.value.filter((c) => c.stage === 'won').length)
    const wonRate = computed(() =>
      total.value === 0 ? 0 : Math.round((wonCount.value / total.value) * 100),
    )

    return {
      list,
      byId,
      byOwner,
      byStage,
      update,
      setStage,
      touchLastVisit,
      transferOwner,
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
  { persist: { key: 'lsm-crm-customers' } },
)
