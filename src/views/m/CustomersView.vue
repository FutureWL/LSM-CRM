<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCustomersStore } from '@/stores/customers'
import { formatMoney, fromNow } from '@/lib/format'
import StageTag from '@/components/StageTag.vue'
import type { CustomerStage } from '@/types'
import { STAGES } from '@/lib/stage'

const router = useRouter()
const auth = useAuthStore()
const customers = useCustomersStore()

const search = ref('')
const stageFilter = ref<CustomerStage | 'all'>('all')

const myCustomers = computed(() => {
  if (!auth.currentUserId) return []
  let list = customers.byOwner(auth.currentUserId)
  if (stageFilter.value !== 'all') {
    list = list.filter((c) => c.stage === stageFilter.value)
  }
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q),
    )
  }
  return list.sort((a, b) => a.company.localeCompare(b.company, 'zh'))
})
</script>

<template>
  <div class="px-4 pt-6 pb-8">
    <h1 class="text-2xl font-bold text-ink-900 mb-1">我的客户</h1>
    <p class="text-sm text-ink-500 mb-4">共 {{ myCustomers.length }} 位</p>

    <input
      v-model="search"
      type="text"
      placeholder="搜索公司、联系人、行业..."
      class="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:border-brand-500 focus:outline-none mb-3"
    />

    <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
      <button
        @click="stageFilter = 'all'"
        class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors"
        :class="
          stageFilter === 'all'
            ? 'bg-ink-900 text-white border-ink-900'
            : 'bg-white text-ink-600 border-ink-200'
        "
      >
        全部
      </button>
      <button
        v-for="s in STAGES"
        :key="s.value"
        @click="stageFilter = s.value"
        class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors"
        :class="
          stageFilter === s.value
            ? 'text-white border-transparent'
            : 'bg-white text-ink-600 border-ink-200'
        "
        :style="stageFilter === s.value ? { backgroundColor: s.color } : {}"
      >
        {{ s.label }}
      </button>
    </div>

    <div v-if="myCustomers.length === 0" class="bg-white rounded-2xl p-12 text-center border border-ink-100">
      <div class="text-4xl mb-2">🔍</div>
      <div class="text-ink-500 text-sm">没有匹配的客户</div>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="c in myCustomers"
        :key="c.id"
        @click="router.push(`/m/customers/${c.id}`)"
        class="bg-white rounded-xl p-3 border border-ink-100 shadow-card active:scale-[0.99] transition-transform"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-11 h-11 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
            :style="{ backgroundColor: '#10b981' }"
          >
            {{ c.company.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <div class="font-medium text-ink-800 truncate">{{ c.company }}</div>
              <StageTag :stage="c.stage" size="sm" />
            </div>
            <div class="text-xs text-ink-500 mt-1">
              {{ c.contact }} · {{ c.industry }}
            </div>
            <div class="text-xs text-ink-400 mt-0.5">
              预估 {{ formatMoney(c.estimatedValue) }}
              <span v-if="c.lastVisitAt" class="ml-2">最近 {{ fromNow(c.lastVisitAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
