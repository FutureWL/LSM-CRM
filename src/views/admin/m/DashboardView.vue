<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, isThisMonth, fromNow } from '@/lib/format'
import { STAGE_MAP } from '@/lib/stage'

const router = useRouter()
const customers = useCustomersStore()
const visits = useVisitsStore()
const users = useUsersStore()
const auth = useAuthStore()

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

const bizKpis = computed(() => [
  {
    label: '待回款',
    value: formatMoney(customers.totalAmountDue),
    sub: `${customers.dueSoonList.length} 笔 7 天内到期`,
    color: '#f59e0b',
    icon: '💵',
  },
  {
    label: '逾期金额',
    value: formatMoney(customers.overdueAmount),
    sub: `${customers.overdueList.length} 笔逾期`,
    color: '#ef4444',
    icon: '⚠️',
  },
  {
    label: '质保中',
    value: customers.inWarrantyList.length,
    sub: `${customers.expiringWarrantyList.length} 笔 30 天内到期`,
    color: '#0ea5e9',
    icon: '🛡️',
  },
  {
    label: '预测商机',
    value: formatMoney(customers.forecastValue),
    sub: `${customers.forecastList.length} 个客户有续单意向`,
    color: '#10b981',
    icon: '📈',
  },
])

const baseKpis = computed(() => [
  { label: '客户总数', value: customers.total, sub: `本月新增 ${customers.newThisMonth}`, color: '#0ea5e9' },
  { label: '本月拜访', value: visits.thisMonth, sub: `今日 ${visits.today} 次`, color: '#10b981' },
  { label: '已成交', value: customers.wonCount, sub: `占比 ${customers.wonRate}%`, color: '#f59e0b' },
  {
    label: '累计成交金额',
    value: formatMoney(
      customers.list.filter((c) => c.stage === 'won').reduce((s, c) => s + c.estimatedValue, 0),
    ),
    sub: '已签约合同估算',
    color: '#8b5cf6',
  },
])

const salesRank = computed(() => {
  return users
    .sales()
    .map((s) => ({
      user: s,
      monthVisits: visits.list.filter((v) => v.salesId === s.id && isThisMonth(v.visitedAt))
        .length,
      wonValue: customers
        .byOwner(s.id)
        .filter((c) => c.stage === 'won')
        .reduce((sum, c) => sum + c.estimatedValue, 0),
    }))
    .sort((a, b) => b.wonValue - a.wonValue)
})

const recentVisits = computed(() =>
  [...visits.list]
    .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
    .slice(0, 5),
)

const overdueSample = computed(() => customers.overdueList.slice(0, 3))
</script>

<template>
  <div class="px-4 pt-5 pb-8 space-y-4">
    <header class="flex items-center gap-3">
      <img
        :src="auth.currentUser?.avatar"
        class="w-11 h-11 rounded-full ring-2 ring-white shadow-card"
      />
      <div class="flex-1">
        <div class="text-ink-400 text-xs">{{ greeting() }},</div>
        <div class="text-ink-900 text-lg font-semibold">{{ auth.currentUser?.name }}</div>
      </div>
      <div class="text-[10px] text-brand-600 bg-brand-50 px-2 py-1 rounded-full font-medium">
        管理后台 · 移动版
      </div>
    </header>

    <div>
      <div class="text-xs text-ink-500 mb-2">核心业务</div>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="k in bizKpis"
          :key="k.label"
          class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card"
        >
          <div class="flex items-center justify-between mb-2">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              :style="{ backgroundColor: k.color + '15', color: k.color }"
            >
              {{ k.icon }}
            </div>
          </div>
          <div class="text-lg font-bold text-ink-900">{{ k.value }}</div>
          <div class="text-xs text-ink-500 mt-0.5">{{ k.label }}</div>
          <div class="text-[10px] text-ink-400 mt-1">{{ k.sub }}</div>
        </div>
      </div>
    </div>

    <div>
      <div class="text-xs text-ink-500 mb-2">基础数据</div>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="k in baseKpis"
          :key="k.label"
          class="bg-white rounded-2xl p-3 border border-ink-100"
        >
          <div class="text-xs text-ink-400">{{ k.label }}</div>
          <div class="text-lg font-bold text-ink-900 mt-1">{{ k.value }}</div>
          <div class="text-[10px] text-ink-400 mt-0.5">{{ k.sub }}</div>
        </div>
      </div>
    </div>

    <div v-if="overdueSample.length > 0" class="bg-red-50 border border-red-100 rounded-2xl p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold text-red-700 flex items-center gap-1.5">
          <span>⚠️</span>
          <span>逾期账款 {{ customers.overdueList.length }} 笔</span>
        </div>
        <button
          @click="router.push('/a/customers')"
          class="text-xs text-red-600 font-medium"
        >查看 →</button>
      </div>
      <div class="space-y-1.5">
        <div
          v-for="c in overdueSample"
          :key="c.id"
          @click="router.push(`/a/customers/${c.id}`)"
          class="bg-white rounded-lg p-2.5 flex items-center justify-between active:scale-[0.99] transition-transform"
        >
          <div>
            <div class="text-sm font-medium text-ink-800">{{ c.company }}</div>
            <div class="text-[10px] text-ink-500">
              {{ users.byId(c.ownerId)?.name }} · 应收 {{ formatMoney(c.amountDue ?? 0) }}
            </div>
          </div>
          <div class="text-[10px] text-red-600 font-medium">逾期</div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-ink-800">销售业绩排行</h3>
        <button @click="router.push('/a/sales')" class="text-xs text-brand-600">全部 →</button>
      </div>
      <div class="space-y-2.5">
        <div
          v-for="(r, idx) in salesRank.slice(0, 5)"
          :key="r.user.id"
          @click="router.push(`/a/sales/${r.user.id}`)"
          class="flex items-center gap-3 active:scale-[0.99] transition-transform"
        >
          <div
            class="w-5 text-xs text-center font-semibold"
            :class="idx < 3 ? 'text-brand-600' : 'text-ink-400'"
          >#{{ idx + 1 }}</div>
          <img :src="r.user.avatar" class="w-8 h-8 rounded-full" />
          <div class="flex-1 min-w-0">
            <div class="text-sm text-ink-800 font-medium truncate">{{ r.user.name }}</div>
            <div class="text-[10px] text-ink-400">本月 {{ r.monthVisits }} 次拜访</div>
          </div>
          <div class="text-sm font-semibold text-brand-600">{{ formatMoney(r.wonValue) }}</div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-ink-800">最近拜访</h3>
        <button @click="router.push('/a/visits')" class="text-xs text-brand-600">全部 →</button>
      </div>
      <div class="space-y-2.5">
        <div
          v-for="v in recentVisits"
          :key="v.id"
          @click="router.push(`/a/customers/${v.customerId}`)"
          class="flex items-start gap-2"
        >
          <div
            class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
            :style="{ backgroundColor: STAGE_MAP[customers.byId(v.customerId)?.stage ?? 'new'].color }"
          >
            {{ customers.byId(v.customerId)?.company.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-ink-800 truncate">{{ customers.byId(v.customerId)?.company }}</div>
            <div class="text-[10px] text-ink-400 mt-0.5 line-clamp-1">
              {{ users.byId(v.salesId)?.name }} · {{ fromNow(v.visitedAt) }}
            </div>
          </div>
        </div>
        <div v-if="recentVisits.length === 0" class="text-xs text-ink-400 text-center py-3">
          暂无拜访记录
        </div>
      </div>
    </div>
  </div>
</template>
