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
  <div class="space-y-4">
    <div class="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">销售</th>
            <th class="text-right px-4 py-3 font-medium">客户数</th>
            <th class="text-right px-4 py-3 font-medium">本月拜访</th>
            <th class="text-right px-4 py-3 font-medium">成交数</th>
            <th class="text-right px-4 py-3 font-medium">成交金额</th>
            <th class="text-left px-4 py-3 font-medium">客户漏斗</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr
            v-for="(r, idx) in rows"
            :key="r.user.id"
            @click="router.push(`/admin/sales/${r.user.id}`)"
            class="hover:bg-ink-50 cursor-pointer transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="text-xs text-ink-400 w-5">#{{ idx + 1 }}</div>
                <img :src="r.user.avatar" class="w-9 h-9 rounded-full" />
                <div>
                  <div class="font-medium text-ink-800">{{ r.user.name }}</div>
                  <div class="text-xs text-ink-500">{{ r.user.team }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-right font-semibold text-ink-800">
              {{ r.customerCount }}
            </td>
            <td class="px-4 py-3 text-right text-ink-700">{{ r.monthVisits }}</td>
            <td class="px-4 py-3 text-right">
              <span
                class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="r.wonCount > 0 ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-500'"
              >
                {{ r.wonCount }}
              </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold text-brand-600">
              {{ formatMoney(r.wonValue) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1 h-2">
                <div
                  v-for="(count, i) in r.funnel"
                  :key="i"
                  class="flex-1 rounded-full"
                  :style="{
                    backgroundColor: count > 0 ? STAGE_MAP[FUNNEL_STAGES[i]].color : '#e2e8f0',
                    opacity: count > 0 ? 1 : 0.3,
                  }"
                  :title="`${STAGE_MAP[FUNNEL_STAGES[i]].label}: ${count}`"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
