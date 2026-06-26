<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { formatMoney, isThisMonth } from '@/lib/format'
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
  return {
    customers: myCustomers.value.length,
    monthVisits: myVisits.value.filter((v) => isThisMonth(v.visitedAt)).length,
    wonCount: myCustomers.value.filter((c) => c.stage === 'won').length,
    wonValue,
  }
})
</script>

<template>
  <div v-if="!user" class="text-center text-ink-500 py-12">销售不存在</div>
  <div v-else class="space-y-4">
    <button
      @click="router.back()"
      class="text-sm text-ink-500 hover:text-ink-800 inline-flex items-center gap-1"
    >
      ← 返回
    </button>

    <div class="bg-white rounded-2xl p-6 border border-ink-100 shadow-card flex items-center gap-5">
      <img :src="user.avatar" class="w-16 h-16 rounded-full" />
      <div class="flex-1">
        <h2 class="text-xl font-semibold text-ink-900">{{ user.name }}</h2>
        <div class="text-sm text-ink-500 mt-0.5">{{ user.team }} · {{ user.title }}</div>
      </div>
      <div class="grid grid-cols-4 gap-8 text-right">
        <div>
          <div class="text-xs text-ink-400">客户数</div>
          <div class="text-xl font-bold text-ink-900 mt-1">{{ stats.customers }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">本月拜访</div>
          <div class="text-xl font-bold text-ink-900 mt-1">{{ stats.monthVisits }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">成交数</div>
          <div class="text-xl font-bold text-brand-600 mt-1">{{ stats.wonCount }}</div>
        </div>
        <div>
          <div class="text-xs text-ink-400">成交金额</div>
          <div class="text-xl font-bold text-brand-600 mt-1">
            {{ formatMoney(stats.wonValue) }}
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white rounded-2xl p-5 border border-ink-100 shadow-card">
        <h3 class="text-sm font-semibold text-ink-800 mb-3">负责客户</h3>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="c in myCustomers"
            :key="c.id"
            @click="router.push(`/admin/customers/${c.id}`)"
            class="flex items-center justify-between p-2.5 rounded-lg hover:bg-ink-50 cursor-pointer"
          >
            <div>
              <div class="text-sm font-medium text-ink-800">{{ c.company }}</div>
              <div class="text-xs text-ink-500">{{ c.contact }} · {{ c.industry }}</div>
            </div>
            <div class="text-sm font-semibold text-ink-700">
              {{ formatMoney(c.estimatedValue) }}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-5 border border-ink-100 shadow-card">
        <h3 class="text-sm font-semibold text-ink-800 mb-3">最近拜访</h3>
        <VisitTimeline :visits="myVisits.slice(0, 10)" />
      </div>
    </div>
  </div>
</template>
