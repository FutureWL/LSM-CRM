<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVisitsStore } from '@/stores/visits'
import { useCustomersStore } from '@/stores/customers'
import { useUsersStore } from '@/stores/users'
import { fromNow, isThisMonth } from '@/lib/format'
import { STAGE_MAP } from '@/lib/stage'
import type { VisitType } from '@/types'

const router = useRouter()
const visits = useVisitsStore()
const customers = useCustomersStore()
const users = useUsersStore()

const filter = ref<'all' | 'month'>('all')
const typeFilter = ref<VisitType | 'all'>('all')
const salesFilter = ref<string>('all')

const list = computed(() => {
  let l = visits.list
  if (filter.value === 'month') l = l.filter((v) => isThisMonth(v.visitedAt))
  if (typeFilter.value !== 'all') l = l.filter((v) => v.visitType === typeFilter.value)
  if (salesFilter.value !== 'all') l = l.filter((v) => v.salesId === salesFilter.value)
  return l
})

const TYPE_LABEL: Record<VisitType, { label: string; color: string; bg: string }> = {
  normal: { label: '普通', color: '#94a3b8', bg: '#f1f5f9' },
  collection: { label: '催款', color: '#f59e0b', bg: '#fef3c7' },
  warranty: { label: '质保', color: '#0ea5e9', bg: '#e0f2fe' },
  introduction: { label: '商机', color: '#10b981', bg: '#d1fae5' },
}
</script>

<template>
  <div class="px-4 pt-4 pb-6 space-y-3">
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      <div class="flex gap-1 p-1 bg-ink-100 rounded-lg flex-shrink-0">
        <button
          v-for="f in [{ v: 'all', l: '全部' }, { v: 'month', l: '本月' }]"
          :key="f.v"
          @click="filter = f.v as 'all' | 'month'"
          class="px-3 py-1 rounded-md text-xs font-medium transition-colors"
          :class="filter === f.v ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'"
        >
          {{ f.l }}
        </button>
      </div>
      <button
        v-for="t in (['all', 'normal', 'collection', 'warranty', 'introduction'] as const)"
        :key="t"
        @click="typeFilter = t"
        class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border flex-shrink-0"
        :class="
          typeFilter === t
            ? 'text-white border-transparent'
            : 'bg-white text-ink-600 border-ink-200'
        "
        :style="
          typeFilter === t && t !== 'all'
            ? { backgroundColor: TYPE_LABEL[t as VisitType].color }
            : typeFilter === t
              ? { backgroundColor: '#0f172a' }
              : {}
        "
      >
        {{ t === 'all' ? '全部类型' : TYPE_LABEL[t as VisitType].label }}
      </button>
    </div>

    <div class="flex items-center gap-2">
      <select
        v-model="salesFilter"
        class="flex-1 px-3 py-2 rounded-lg border border-ink-200 bg-white text-xs focus:border-brand-500 focus:outline-none"
      >
        <option value="all">全部销售</option>
        <option v-for="s in users.sales()" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
      <div class="text-xs text-ink-400">共 {{ list.length }} 条</div>
    </div>

    <div class="space-y-2">
      <div
        v-for="v in list"
        :key="v.id"
        class="bg-white rounded-2xl p-3 border border-ink-100"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            :style="{ backgroundColor: STAGE_MAP[customers.byId(v.customerId)?.stage ?? 'new'].color }"
          >
            {{ customers.byId(v.customerId)?.company.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <button
                @click="router.push(`/a/customers/${v.customerId}`)"
                class="font-medium text-ink-800 text-sm truncate text-left"
              >{{ customers.byId(v.customerId)?.company }}</button>
              <div class="flex items-center gap-1 flex-shrink-0">
                <span
                  v-if="v.visitType && v.visitType !== 'normal'"
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  :style="{
                    color: TYPE_LABEL[v.visitType].color,
                    backgroundColor: TYPE_LABEL[v.visitType].bg,
                  }"
                >{{ TYPE_LABEL[v.visitType].label }}</span>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  :class="{
                    'bg-brand-50 text-brand-700': v.result === 'progress',
                    'bg-red-50 text-red-700': v.result === 'obstacle',
                    'bg-blue-50 text-blue-700': v.result === 'done',
                  }"
                >{{ v.result === 'progress' ? '有进展' : v.result === 'obstacle' ? '有阻碍' : '已完成' }}</span>
              </div>
            </div>
            <div class="text-xs text-ink-500 mt-1 line-clamp-2 leading-relaxed">
              {{ v.content }}
            </div>
            <div class="flex items-center justify-between mt-2 text-[10px] text-ink-400">
              <div class="flex items-center gap-1">
                <img
                  v-if="users.byId(v.salesId)"
                  :src="users.byId(v.salesId)!.avatar"
                  class="w-3.5 h-3.5 rounded-full"
                />
                <span>{{ users.byId(v.salesId)?.name }}</span>
                <span>·</span>
                <span>{{ fromNow(v.visitedAt) }}</span>
              </div>
              <span class="text-ink-500">{{ v.duration }} 分钟</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="list.length === 0" class="bg-white rounded-2xl p-8 text-center border border-ink-100">
        <div class="text-3xl mb-2">📭</div>
        <div class="text-ink-500 text-sm">暂无拜访记录</div>
      </div>
    </div>
  </div>
</template>
