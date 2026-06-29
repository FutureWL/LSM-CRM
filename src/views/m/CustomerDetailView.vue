<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { useUsersStore } from '@/stores/users'
import { formatDate, formatMoney } from '@/lib/format'
import StageTag from '@/components/StageTag.vue'
import VisitTimeline from '@/components/VisitTimeline.vue'
import AppIcon from '@/components/AppIcon.vue'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const customers = useCustomersStore()
const visits = useVisitsStore()
const users = useUsersStore()

const customer = computed(() => customers.byId(route.params.id as string))
const owner = computed(() => (customer.value ? users.byId(customer.value.ownerId) : null))
const visitList = computed(() => (customer.value ? visits.byCustomer(customer.value.id) : []))

const warrantyEnd = computed(() =>
  customer.value ? customers.warrantyEndAt(customer.value) : undefined,
)
const daysToDue = computed(() => {
  if (!customer.value?.dueDate) return null
  return dayjs(customer.value.dueDate).diff(dayjs(), 'day')
})
const paymentState = computed(() => {
  if (daysToDue.value === null || !customer.value?.amountDue || customer.value.amountDue <= 0)
    return 'none' as const
  if (daysToDue.value < 0) return 'overdue' as const
  if (daysToDue.value <= 7) return 'soon' as const
  return 'normal' as const
})
const warrantyState = computed(() => {
  if (!warrantyEnd.value) return 'none' as const
  const d = dayjs(warrantyEnd.value).diff(dayjs(), 'day')
  if (d < 0) return 'expired' as const
  if (d <= 30) return 'expiring' as const
  return 'active' as const
})
const warrantyDaysLeft = computed(() =>
  warrantyEnd.value ? dayjs(warrantyEnd.value).diff(dayjs(), 'day') : null,
)
</script>

<template>
  <div v-if="!customer" class="p-6 text-center text-ink-500">客户不存在</div>
  <div v-else class="min-h-full bg-ink-50 pb-20">
    <header class="safe-area-top bg-white border-b border-ink-100">
      <div class="px-4 py-3 flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-100"
        >
          ←
        </button>
        <h1 class="text-base font-semibold text-ink-900 flex-1">客户详情</h1>
      </div>
    </header>

    <div class="px-4 pt-5 pb-3">
      <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
        <div class="flex items-start gap-3">
          <div
            class="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            :style="{ backgroundColor: '#10b981' }"
          >
            {{ customer.company.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-lg font-semibold text-ink-900">{{ customer.company }}</div>
            <div class="text-sm text-ink-500 mt-0.5">{{ customer.industry }}</div>
            <div class="mt-2">
              <StageTag :stage="customer.stage" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-ink-100">
          <div>
            <div class="text-xs text-ink-400">联系人</div>
            <div class="text-sm text-ink-800 mt-0.5">{{ customer.contact }}</div>
          </div>
          <div>
            <div class="text-xs text-ink-400">电话</div>
            <div class="text-sm text-ink-800 mt-0.5">{{ customer.phone }}</div>
          </div>
          <div>
            <div class="text-xs text-ink-400">预估金额</div>
            <div class="text-sm font-semibold text-brand-600 mt-0.5">
              {{ formatMoney(customer.estimatedValue) }}
            </div>
          </div>
          <div>
            <div class="text-xs text-ink-400">归属销售</div>
            <div class="text-sm text-ink-800 mt-0.5 flex items-center gap-1">
              <img v-if="owner" :src="owner.avatar" class="w-4 h-4 rounded-full" />
              {{ owner?.name }}
            </div>
          </div>
        </div>

        <div v-if="customer.address" class="mt-3 text-xs text-ink-500 flex items-start gap-1">
          <AppIcon name="MapPinIcon" class="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{{ customer.address }}</span>
        </div>
        <div v-if="customer.remark" class="mt-3 p-3 bg-ink-50 rounded-lg text-xs text-ink-600 leading-relaxed">
          {{ customer.remark }}
        </div>
      </div>
    </div>

    <!-- 账款 / 质保 / 商机预测(已成交客户显示) -->
    <template v-if="customer.stage === 'won'">
      <div v-if="customer.amountDue && customer.amountDue > 0" class="px-4 pb-3">
        <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="text-base text-amber-500">
              <AppIcon name="CurrencyDollarIcon" class="w-5 h-5" />
            </div>
              <div class="text-sm font-semibold text-ink-800">账款</div>
              <span
                v-if="paymentState === 'overdue'"
                class="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium"
              >逾期</span>
              <span
                v-else-if="paymentState === 'soon'"
                class="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium"
              >即将到期</span>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-ink-900">
                {{ formatMoney(customer.amountDue) }}
              </div>
              <div class="text-[10px] text-ink-400">未收金额</div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3 text-xs pt-3 border-t border-ink-100">
            <div>
              <div class="text-ink-400">账期</div>
              <div class="text-ink-800 mt-0.5">{{ customer.paymentTermDays }} 天</div>
            </div>
            <div>
              <div class="text-ink-400">应收日期</div>
              <div class="text-ink-800 mt-0.5">
                {{ customer.dueDate ? formatDate(customer.dueDate, 'MM-DD') : '—' }}
              </div>
            </div>
            <div>
              <div class="text-ink-400">{{ daysToDue !== null && daysToDue >= 0 ? '距到期' : '已逾期' }}</div>
              <div
                class="mt-0.5 font-medium"
                :class="paymentState === 'overdue' ? 'text-red-600' : paymentState === 'soon' ? 'text-amber-600' : 'text-ink-700'"
              >
                {{ daysToDue !== null ? Math.abs(daysToDue) + ' 天' : '—' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="customer.warrantyStartAt" class="px-4 pb-3">
        <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="text-base text-sky-500">
              <AppIcon name="ShieldCheckIcon" class="w-5 h-5" />
            </div>
              <div class="text-sm font-semibold text-ink-800">质保期</div>
              <span
                v-if="warrantyState === 'active'"
                class="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-medium"
              >质保中</span>
              <span
                v-else-if="warrantyState === 'expiring'"
                class="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium"
              >即将到期</span>
              <span
                v-else-if="warrantyState === 'expired'"
                class="text-[10px] px-2 py-0.5 rounded-full bg-ink-100 text-ink-500 font-medium"
              >已过保</span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div class="text-ink-400">开始</div>
              <div class="text-ink-800 mt-0.5">
                {{ formatDate(customer.warrantyStartAt, 'YYYY-MM-DD') }}
              </div>
            </div>
            <div>
              <div class="text-ink-400">到期</div>
              <div class="text-ink-800 mt-0.5">
                {{ warrantyEnd ? formatDate(warrantyEnd, 'YYYY-MM-DD') : '—' }}
              </div>
            </div>
            <div>
              <div class="text-ink-400">{{ warrantyDaysLeft !== null && warrantyDaysLeft >= 0 ? '剩余' : '已过保' }}</div>
              <div
                class="mt-0.5 font-medium"
                :class="warrantyState === 'expiring' ? 'text-amber-600' : warrantyState === 'expired' ? 'text-ink-400' : 'text-sky-600'"
              >
                {{ warrantyDaysLeft !== null ? Math.abs(warrantyDaysLeft) + ' 天' : '—' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="customer.predictedNextValue" class="px-4 pb-3">
        <div
          class="rounded-2xl p-4 text-white shadow-card relative overflow-hidden"
          style="background: linear-gradient(135deg, #10b981 0%, #047857 100%)"
        >
          <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
          <div class="relative">
            <div class="flex items-center justify-between">
              <div class="text-xs text-brand-100 inline-flex items-center gap-1">
              <AppIcon name="ArrowTrendingUpIcon" class="w-3 h-3" />
              商机预测 · 下一单
            </div>
              <div class="text-[10px] px-2 py-0.5 rounded-full bg-white/20">
                {{ customer.predictedProduct }}
              </div>
            </div>
            <div class="text-2xl font-bold mt-2">
              {{ formatMoney(customer.predictedNextValue) }}
            </div>
            <div class="text-xs text-brand-100 mt-1">
              预测于 {{ customer.predictedAt ? formatDate(customer.predictedAt, 'YYYY-MM-DD') : '—' }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 快捷操作 -->
    <div class="px-4 pb-3 grid grid-cols-2 gap-2">
      <button
        @click="router.push(`/m/visit/new?customerId=${customer.id}&type=collection`)"
        class="py-3 rounded-2xl bg-amber-50 text-amber-700 text-sm font-medium active:scale-[0.99] transition-transform border border-amber-100"
      >
        催款跟进
      </button>
      <button
        @click="router.push(`/m/visit/new?customerId=${customer.id}&type=warranty`)"
        class="py-3 rounded-2xl bg-sky-50 text-sky-700 text-sm font-medium active:scale-[0.99] transition-transform border border-sky-100"
      >
        质保回访
      </button>
      <button
        @click="router.push(`/m/visit/new?customerId=${customer.id}&type=introduction`)"
        class="py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-medium active:scale-[0.99] transition-transform border border-emerald-100"
      >
        商机介绍
      </button>
      <button
        @click="router.push(`/m/visit/new?customerId=${customer.id}`)"
        class="py-3 rounded-2xl text-white font-semibold shadow-lift active:scale-[0.99] transition-transform"
        style="background: linear-gradient(135deg, #10b981 0%, #047857 100%)"
      >
        记录新拜访
      </button>
    </div>

    <div class="px-4">
      <h2 class="text-ink-800 font-semibold mb-3">跟进时间线</h2>
      <VisitTimeline :visits="visitList" />
    </div>
  </div>
</template>
