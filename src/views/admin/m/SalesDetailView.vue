<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { formatMoney, isThisMonth, fromNow } from '@/lib/format'
import StageTag from '@/components/StageTag.vue'
import VisitTimeline from '@/components/VisitTimeline.vue'

const route = useRoute()
const router = useRouter()
const users = useUsersStore()
const customers = useCustomersStore()
const visits = useVisitsStore()

const user = computed(() => users.byId(route.params.id as string))
const myCustomers = computed(() => (user.value ? customers.byOwner(user.value.id) : []))
const myVisits = computed(() => (user.value ? visits.bySales(user.value.id) : []))

const stats = computed(() => {
  const wonValue = myCustomers.value
    .filter((c) => c.stage === 'won')
    .reduce((s, c) => s + c.estimatedValue, 0)
  const dueAmount = myCustomers.value.reduce((s, c) => s + (c.amountDue ?? 0), 0)
  return {
    customers: myCustomers.value.length,
    monthVisits: myVisits.value.filter((v) => isThisMonth(v.visitedAt)).length,
    wonCount: myCustomers.value.filter((c) => c.stage === 'won').length,
    wonValue,
    dueAmount,
  }
})
</script>

<template>
  <div v-if="!user" class="p-6 text-center text-ink-500">销售不存在</div>
  <div v-else class="min-h-full bg-ink-50 pb-8">
    <header class="safe-area-top bg-white border-b border-ink-100">
      <div class="px-4 py-3 flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-100"
        >
          ←
        </button>
        <h1 class="text-base font-semibold text-ink-900 flex-1">销售详情</h1>
      </div>
    </header>

    <div class="px-4 pt-5 pb-3">
      <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
        <div class="flex items-center gap-3">
          <img :src="user.avatar" class="w-14 h-14 rounded-full" />
          <div class="flex-1 min-w-0">
            <div class="text-lg font-semibold text-ink-900">{{ user.name }}</div>
            <div class="text-xs text-ink-500 mt-0.5">{{ user.team }} · {{ user.title }}</div>
          </div>
        </div>
        <div class="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-ink-100 text-center">
          <div>
            <div class="text-lg font-bold text-ink-900">{{ stats.customers }}</div>
            <div class="text-[10px] text-ink-400 mt-0.5">客户</div>
          </div>
          <div>
            <div class="text-lg font-bold text-ink-900">{{ stats.monthVisits }}</div>
            <div class="text-[10px] text-ink-400 mt-0.5">本月拜访</div>
          </div>
          <div>
            <div class="text-lg font-bold text-brand-600">{{ stats.wonCount }}</div>
            <div class="text-[10px] text-ink-400 mt-0.5">成交</div>
          </div>
          <div>
            <div class="text-lg font-bold text-brand-600">{{ formatMoney(stats.wonValue) }}</div>
            <div class="text-[10px] text-ink-400 mt-0.5">成交额</div>
          </div>
        </div>
        <div
          v-if="stats.dueAmount > 0"
          class="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between"
        >
          <div class="text-xs text-ink-500">待回款</div>
          <div class="text-base font-bold text-amber-600">{{ formatMoney(stats.dueAmount) }}</div>
        </div>
      </div>
    </div>

    <div class="px-4 pb-3">
      <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
        <h3 class="text-sm font-semibold text-ink-800 mb-3">负责客户</h3>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="c in myCustomers"
            :key="c.id"
            @click="router.push(`/a/customers/${c.id}`)"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50 active:bg-ink-50"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              :style="{ backgroundColor: '#10b981' }"
            >{{ c.company.charAt(0) }}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-ink-800 truncate">{{ c.company }}</div>
              <div class="text-[10px] text-ink-400 mt-0.5">
                {{ c.contact }} · {{ c.lastVisitAt ? fromNow(c.lastVisitAt) : '未拜访' }}
              </div>
            </div>
            <StageTag :stage="c.stage" size="sm" />
          </div>
        </div>
      </div>
    </div>

    <div class="px-4">
      <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
        <h3 class="text-sm font-semibold text-ink-800 mb-3">最近拜访</h3>
        <VisitTimeline :visits="myVisits.slice(0, 8)" />
      </div>
    </div>
  </div>
</template>
