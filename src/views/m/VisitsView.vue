<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useVisitsStore } from '@/stores/visits'
import { useCustomersStore } from '@/stores/customers'
import { formatDate, fromNow } from '@/lib/format'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const auth = useAuthStore()
const visits = useVisitsStore()
const customers = useCustomersStore()

const filter = ref<'all' | 'today' | 'week' | 'month'>('all')

const myVisits = computed(() => {
  if (!auth.currentUserId) return []
  const base = visits.bySales(auth.currentUserId)
  const now = Date.now()
  if (filter.value === 'today') {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    return base.filter((v) => new Date(v.visitedAt).getTime() >= todayStart)
  }
  if (filter.value === 'week') {
    return base.filter((v) => new Date(v.visitedAt).getTime() >= now - 7 * 86400000)
  }
  if (filter.value === 'month') {
    return base.filter((v) => new Date(v.visitedAt).getTime() >= now - 30 * 86400000)
  }
  return base
})
</script>

<template>
  <div class="px-4 pt-6 pb-8">
    <h1 class="text-2xl font-bold text-ink-900 mb-1">拜访记录</h1>
    <p class="text-sm text-ink-500 mb-4">共 {{ myVisits.length }} 条</p>

    <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
      <button
        v-for="f in [
          { v: 'all', l: '全部' },
          { v: 'today', l: '今天' },
          { v: 'week', l: '近 7 天' },
          { v: 'month', l: '近 30 天' },
        ]"
        :key="f.v"
        @click="filter = f.v as any"
        class="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors"
        :class="
          filter === f.v
            ? 'bg-ink-900 text-white border-ink-900'
            : 'bg-white text-ink-600 border-ink-200'
        "
      >
        {{ f.l }}
      </button>
    </div>

    <div v-if="myVisits.length === 0" class="bg-white rounded-2xl p-12 text-center border border-ink-100">
      <div class="text-4xl mb-2 text-brand-500">
        <AppIcon name="ClipboardDocumentListIcon" class="w-10 h-10" />
      </div>
      <div class="text-ink-500 text-sm">暂无拜访记录</div>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="v in myVisits"
        :key="v.id"
        @click="router.push(`/m/customers/${v.customerId}`)"
        class="bg-white rounded-xl p-4 border border-ink-100 shadow-card active:scale-[0.99] transition-transform"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="font-medium text-ink-800">
            {{ customers.byId(v.customerId)?.company }}
          </div>
          <div class="text-xs text-ink-400">{{ fromNow(v.visitedAt) }}</div>
        </div>
        <div class="text-sm text-ink-600 line-clamp-2 leading-relaxed">{{ v.content }}</div>
        <div class="flex items-center gap-3 mt-3 text-xs text-ink-400">
          <span class="inline-flex items-center gap-1">
            <AppIcon name="CalendarDaysIcon" class="w-3 h-3" />
            {{ formatDate(v.visitedAt, 'MM-DD HH:mm') }}
          </span>
          <span>⏱ {{ v.duration }} 分钟</span>
        </div>
      </div>
    </div>
  </div>
</template>
