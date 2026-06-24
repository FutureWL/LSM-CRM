<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { formatMoney, isThisMonth } from '@/lib/format'
import { FUNNEL_STAGES, STAGE_MAP } from '@/lib/stage'

const router = useRouter()
const users = useUsersStore()
const customers = useCustomersStore()
const visits = useVisitsStore()

const rows = computed(() => {
  return users.sales().map((s) => {
    const myCustomers = customers.byOwner(s.id)
    const myVisits = visits.bySales(s.id)
    const wonValue = myCustomers
      .filter((c) => c.stage === 'won')
      .reduce((sum, c) => sum + c.estimatedValue, 0)
    return {
      user: s,
      customerCount: myCustomers.length,
      monthVisits: myVisits.filter((v) => isThisMonth(v.visitedAt)).length,
      wonCount: myCustomers.filter((c) => c.stage === 'won').length,
      wonValue,
      funnel: FUNNEL_STAGES.map(
        (stage) => myCustomers.filter((c) => c.stage === stage).length,
      ),
    }
  }).sort((a, b) => b.wonValue - a.wonValue)
})
</script>

<template>
  <div class="px-4 pt-4 pb-6 space-y-2">
    <div class="text-xs text-ink-400 mb-1">共 {{ rows.length }} 位销售 · 按成交额排序</div>
    <div
      v-for="(r, idx) in rows"
      :key="r.user.id"
      @click="router.push(`/a/sales/${r.user.id}`)"
      class="bg-white rounded-2xl p-4 border border-ink-100 active:scale-[0.99] transition-transform"
    >
      <div class="flex items-center gap-3 mb-3">
        <div
          class="w-5 text-xs text-center font-semibold flex-shrink-0"
          :class="idx < 3 ? 'text-brand-600' : 'text-ink-400'"
        >#{{ idx + 1 }}</div>
        <img :src="r.user.avatar" class="w-10 h-10 rounded-full" />
        <div class="flex-1 min-w-0">
          <div class="font-medium text-ink-800">{{ r.user.name }}</div>
          <div class="text-xs text-ink-500">{{ r.user.team }} · {{ r.user.title }}</div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold text-brand-600">{{ formatMoney(r.wonValue) }}</div>
          <div class="text-[10px] text-ink-400">成交金额</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3 pt-3 border-t border-ink-100 text-center">
        <div>
          <div class="text-base font-semibold text-ink-900">{{ r.customerCount }}</div>
          <div class="text-[10px] text-ink-400 mt-0.5">客户数</div>
        </div>
        <div class="border-l border-r border-ink-100">
          <div class="text-base font-semibold text-ink-900">{{ r.monthVisits }}</div>
          <div class="text-[10px] text-ink-400 mt-0.5">本月拜访</div>
        </div>
        <div>
          <div class="text-base font-semibold text-brand-600">{{ r.wonCount }}</div>
          <div class="text-[10px] text-ink-400 mt-0.5">成交数</div>
        </div>
      </div>
      <div class="flex gap-1 h-1.5 mt-3">
        <div
          v-for="(count, i) in r.funnel"
          :key="i"
          class="flex-1 rounded-full"
          :style="{
            backgroundColor: count > 0 ? STAGE_MAP[FUNNEL_STAGES[i]].color : '#e2e8f0',
            opacity: count > 0 ? 1 : 0.3,
          }"
        />
      </div>
    </div>
  </div>
</template>
