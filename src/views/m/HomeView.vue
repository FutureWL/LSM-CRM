<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { isToday, formatMoney, fromNow } from '@/lib/format'
import StageTag from '@/components/StageTag.vue'
import AppIcon from '@/components/AppIcon.vue'
import dayjs from 'dayjs'

const router = useRouter()
const auth = useAuthStore()
const customers = useCustomersStore()
const visits = useVisitsStore()

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

const myCustomers = computed(() =>
  auth.currentUserId ? customers.byOwner(auth.currentUserId) : [],
)
const myCustomerIds = computed(() => new Set(myCustomers.value.map((c) => c.id)))
const todayVisits = computed(() =>
  visits.list.filter(
    (v) => v.salesId === auth.currentUserId && isToday(v.visitedAt),
  ),
)
const recentlyContacted = computed(() => {
  return myCustomers.value
    .filter(
      (c) =>
        c.lastVisitAt &&
        new Date(c.lastVisitAt).getTime() > Date.now() - 14 * 86400000,
    )
    .sort(
      (a, b) =>
        new Date(b.lastVisitAt!).getTime() - new Date(a.lastVisitAt!).getTime(),
    )
    .slice(0, 5)
})

// 待催款:我名下的客户里有未收账款且到期 / 7 天内到期
const collectionTodo = computed(() =>
  myCustomers.value
    .filter(
      (c) =>
        c.amountDue &&
        c.amountDue > 0 &&
        c.dueDate &&
        dayjs(c.dueDate).diff(dayjs(), 'day') <= 7,
    )
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
)
// 质保回访:30 天内质保到期
const warrantyTodo = computed(() =>
  myCustomers.value.filter((c) => {
    if (!c.warrantyStartAt || !c.warrantyMonths) return false
    const end = dayjs(c.warrantyStartAt).add(c.warrantyMonths, 'month')
    const days = end.diff(dayjs(), 'day')
    return days >= 0 && days <= 30
  }),
)

const stats = computed(() => {
  const myVisits = visits.bySales(auth.currentUserId ?? '')
  const myWonValue = myCustomers.value
    .filter((c) => c.stage === 'won')
    .reduce((sum, c) => sum + c.estimatedValue, 0)
  const myDueAmount = myCustomers.value.reduce(
    (s, c) => s + (c.amountDue ?? 0),
    0,
  )
  const myForecast = myCustomers.value.reduce(
    (s, c) => s + (c.predictedNextValue ?? 0),
    0,
  )
  return {
    customers: myCustomers.value.length,
    monthVisits: myVisits.filter((v) => dayjs(v.visitedAt).isSame(dayjs(), 'month')).length,
    wonValue: myWonValue,
    dueAmount: myDueAmount,
    forecast: myForecast,
  }
})

function daysToDue(dueDate?: string): number {
  if (!dueDate) return 0
  return dayjs(dueDate).diff(dayjs(), 'day')
}
</script>

<template>
  <div class="px-4 pt-6 pb-8 space-y-5">
    <header class="flex items-center gap-3">
      <img
        :src="auth.currentUser?.avatar"
        :alt="auth.currentUser?.name"
        class="w-12 h-12 rounded-full ring-2 ring-white shadow-card"
      />
      <div class="flex-1">
        <div class="text-ink-400 text-xs">{{ greeting() }},</div>
        <div class="text-ink-900 text-lg font-semibold">{{ auth.currentUser?.name }}</div>
      </div>
    </header>

    <div
      class="rounded-2xl p-5 text-white relative overflow-hidden"
      style="background: linear-gradient(135deg, #10b981 0%, #047857 100%)"
    >
      <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div class="absolute right-8 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
      <div class="relative">
        <div class="text-brand-100 text-xs">本月已成交</div>
        <div class="text-3xl font-bold mt-1">{{ formatMoney(stats.wonValue) }}</div>
        <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/15">
          <div>
            <div class="text-2xl font-semibold">{{ stats.customers }}</div>
            <div class="text-brand-100 text-xs">负责客户</div>
          </div>
          <div>
            <div class="text-2xl font-semibold">{{ stats.monthVisits }}</div>
            <div class="text-brand-100 text-xs">本月拜访</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-xs text-ink-400">待回款</div>
          <div class="text-amber-500">
            <AppIcon name="CurrencyDollarIcon" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-xl font-bold text-ink-900 mt-1.5">
          {{ formatMoney(stats.dueAmount) }}
        </div>
        <div class="text-xs text-ink-400 mt-0.5">
          {{ collectionTodo.length }} 笔需催收
        </div>
      </div>
      <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-xs text-ink-400">预测商机</div>
          <div class="text-brand-500">
            <AppIcon name="ArrowTrendingUpIcon" class="w-4 h-4" />
          </div>
        </div>
        <div class="text-xl font-bold text-ink-900 mt-1.5">
          {{ formatMoney(stats.forecast) }}
        </div>
        <div class="text-xs text-ink-400 mt-0.5">
          {{ myCustomers.filter((c) => c.predictedNextValue).length }} 个客户有续单意向
        </div>
      </div>
    </div>

    <section v-if="collectionTodo.length > 0">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-ink-800 font-semibold flex items-center gap-1.5">
          <span class="text-amber-500">
            <AppIcon name="CurrencyDollarIcon" class="w-4 h-4" />
          </span>
          <span>今日待催款</span>
        </h2>
        <span class="text-xs text-ink-400">{{ collectionTodo.length }} 笔</span>
      </div>
      <div class="space-y-2">
        <div
          v-for="c in collectionTodo"
          :key="c.id"
          @click="router.push(`/m/customers/${c.id}`)"
          class="bg-white rounded-xl p-3 border border-ink-100 active:scale-[0.99] transition-transform"
        >
          <div class="flex items-center justify-between">
            <div class="font-medium text-ink-800">{{ c.company }}</div>
            <span
              :class="[
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                daysToDue(c.dueDate) < 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-amber-50 text-amber-600',
              ]"
            >
              {{ daysToDue(c.dueDate) < 0 ? '逾期 ' + (-daysToDue(c.dueDate)) + ' 天' : daysToDue(c.dueDate) + ' 天后到期' }}
            </span>
          </div>
          <div class="flex items-center justify-between mt-1.5 text-xs text-ink-500">
            <span>未收 {{ formatMoney(c.amountDue ?? 0) }} · 账期 {{ c.paymentTermDays }} 天</span>
            <span class="text-brand-600">去催收 →</span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="warrantyTodo.length > 0">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-ink-800 font-semibold flex items-center gap-1.5">
          <span class="text-sky-500">
            <AppIcon name="ShieldCheckIcon" class="w-4 h-4" />
          </span>
          <span>质保回访</span>
        </h2>
        <span class="text-xs text-ink-400">{{ warrantyTodo.length }} 个</span>
      </div>
      <div class="space-y-2">
        <div
          v-for="c in warrantyTodo"
          :key="c.id"
          @click="router.push(`/m/customers/${c.id}`)"
          class="bg-white rounded-xl p-3 border border-ink-100 active:scale-[0.99] transition-transform flex items-center gap-3"
        >
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style="background-color: #0ea5e9"
          >
            {{ c.company.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-ink-800 text-sm truncate">{{ c.company }}</div>
            <div class="text-xs text-ink-500 mt-0.5">
              质保期 {{ c.warrantyMonths }} 个月,即将到期
            </div>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-medium">
            30 天内
          </span>
        </div>
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-ink-800 font-semibold">今日拜访</h2>
        <span class="text-xs text-ink-400">{{ todayVisits.length }} 条</span>
      </div>
      <div
        v-if="todayVisits.length === 0"
        class="bg-white rounded-2xl p-8 text-center border border-ink-100"
      >
        <div class="text-3xl mb-2 text-amber-500">
          <AppIcon name="ClockIcon" class="w-8 h-8" />
        </div>
        <div class="text-ink-500 text-sm">今天还没有拜访记录</div>
        <button
          @click="router.push('/m/visit/new')"
          class="mt-3 inline-flex items-center gap-1 text-brand-600 text-sm font-medium"
        >
          立即记录 →
        </button>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="v in todayVisits"
          :key="v.id"
          @click="router.push(`/m/customers/${v.customerId}`)"
          class="bg-white rounded-xl p-3 border border-ink-100 active:scale-[0.99] transition-transform"
        >
          <div class="flex items-center justify-between">
            <div class="font-medium text-ink-800">
              {{ customers.byId(v.customerId)?.company }}
            </div>
            <StageTag :stage="customers.byId(v.customerId)?.stage ?? 'new'" size="sm" />
          </div>
          <div class="text-xs text-ink-500 mt-1 line-clamp-1">{{ v.content }}</div>
        </div>
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-ink-800 font-semibold">最近联系</h2>
        <button @click="router.push('/m/customers')" class="text-xs text-brand-600">
          全部 →
        </button>
      </div>
      <div class="space-y-2">
        <div
          v-for="c in recentlyContacted"
          :key="c.id"
          @click="router.push(`/m/customers/${c.id}`)"
          class="bg-white rounded-xl p-3 border border-ink-100 flex items-center gap-3"
        >
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
            :style="{ backgroundColor: '#10b981' }"
          >
            {{ c.company.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-ink-800 text-sm truncate">{{ c.company }}</div>
            <div class="text-xs text-ink-500 mt-0.5">
              {{ c.contact }} · {{ fromNow(c.lastVisitAt) }}
            </div>
          </div>
          <StageTag :stage="c.stage" size="sm" />
        </div>
      </div>
    </section>
  </div>
</template>
