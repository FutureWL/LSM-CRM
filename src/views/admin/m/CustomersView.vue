<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomersStore } from '@/stores/customers'
import { useUsersStore } from '@/stores/users'
import { formatMoney, fromNow } from '@/lib/format'
import StageTag from '@/components/StageTag.vue'
import { STAGES, STAGE_MAP } from '@/lib/stage'
import type { CustomerStage } from '@/types'

const router = useRouter()
const customers = useCustomersStore()
const users = useUsersStore()

const search = ref('')
const stageFilter = ref<CustomerStage | 'all'>('all')
const ownerFilter = ref<string>('all')

const filtered = computed(() => {
  let list = customers.list
  if (stageFilter.value !== 'all') {
    list = list.filter((c) => c.stage === stageFilter.value)
  }
  if (ownerFilter.value !== 'all') {
    list = list.filter((c) => c.ownerId === ownerFilter.value)
  }
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q),
    )
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
})
</script>

<template>
  <div class="px-4 pt-4 pb-6 space-y-3">
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      <button
        @click="stageFilter = 'all'"
        class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors"
        :class="
          stageFilter === 'all'
            ? 'bg-ink-900 text-white border-ink-900'
            : 'bg-white text-ink-600 border-ink-200'
        "
      >全部 {{ customers.total }}</button>
      <button
        v-for="s in STAGES"
        :key="s.value"
        @click="stageFilter = s.value"
        class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors"
        :class="
          stageFilter === s.value
            ? 'text-white border-transparent'
            : 'bg-white text-ink-600 border-ink-200'
        "
        :style="stageFilter === s.value ? { backgroundColor: s.color } : {}"
      >
        {{ s.label }} {{ customers.byStage(s.value).length }}
      </button>
    </div>

    <div class="flex gap-2">
      <input
        v-model="search"
        type="text"
        placeholder="搜索公司、联系人..."
        class="flex-1 px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm focus:border-brand-500 focus:outline-none"
      />
      <select
        v-model="ownerFilter"
        class="px-2 py-2 rounded-lg border border-ink-200 bg-white text-xs focus:border-brand-500 focus:outline-none"
      >
        <option value="all">全部销售</option>
        <option v-for="s in users.sales()" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div>

    <div class="text-xs text-ink-400">共 {{ filtered.length }} 位客户</div>

    <div class="space-y-2">
      <div
        v-for="c in filtered"
        :key="c.id"
        @click="router.push(`/a/customers/${c.id}`)"
        class="bg-white rounded-2xl p-3 border border-ink-100 active:scale-[0.99] transition-transform"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            :style="{ backgroundColor: STAGE_MAP[c.stage].color }"
          >
            {{ c.company.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="font-medium text-ink-800 truncate">{{ c.company }}</div>
              <StageTag :stage="c.stage" size="sm" />
            </div>
            <div class="text-xs text-ink-500 mt-0.5 truncate">
              {{ c.contact }} · {{ c.industry }}
            </div>
            <div class="flex items-center justify-between mt-1.5">
              <div class="text-[10px] text-ink-400">
                {{ users.byId(c.ownerId)?.name }} · {{ c.lastVisitAt ? fromNow(c.lastVisitAt) : '未拜访' }}
              </div>
              <div class="text-sm font-semibold text-brand-600">
                {{ formatMoney(c.estimatedValue) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="bg-white rounded-2xl p-8 text-center border border-ink-100">
        <div class="text-3xl mb-2">🔍</div>
        <div class="text-ink-500 text-sm">没有匹配的客户</div>
      </div>
    </div>
  </div>
</template>
