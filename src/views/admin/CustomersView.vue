<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomersStore } from '@/stores/customers'
import { useUsersStore } from '@/stores/users'
import { formatMoney, formatDay, fromNow } from '@/lib/format'
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

const stageCounts = computed(() => {
  const counts: Record<string, number> = { all: customers.total }
  for (const s of STAGES) counts[s.value] = customers.byStage(s.value).length
  return counts
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-2 overflow-x-auto no-scrollbar">
      <button
        @click="stageFilter = 'all'"
        class="px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors flex items-center gap-1.5"
        :class="
          stageFilter === 'all'
            ? 'bg-ink-900 text-white border-ink-900'
            : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
        "
      >
        全部
        <span class="text-[10px] opacity-70">{{ stageCounts.all }}</span>
      </button>
      <button
        v-for="s in STAGES"
        :key="s.value"
        @click="stageFilter = s.value"
        class="px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors flex items-center gap-1.5"
        :class="
          stageFilter === s.value
            ? 'text-white border-transparent'
            : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
        "
        :style="stageFilter === s.value ? { backgroundColor: s.color } : {}"
      >
        {{ s.label }}
        <span class="text-[10px] opacity-70">{{ stageCounts[s.value] }}</span>
      </button>
    </div>

    <div class="flex gap-3">
      <input
        v-model="search"
        type="text"
        placeholder="搜索公司、联系人..."
        class="flex-1 px-4 py-2 rounded-lg border border-ink-200 bg-white text-sm focus:border-brand-500 focus:outline-none"
      />
      <select
        v-model="ownerFilter"
        class="px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm focus:border-brand-500 focus:outline-none"
      >
        <option value="all">全部销售</option>
        <option v-for="s in users.sales()" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
    </div>

    <div class="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">公司 / 联系人</th>
            <th class="text-left px-4 py-3 font-medium">阶段</th>
            <th class="text-left px-4 py-3 font-medium">销售</th>
            <th class="text-left px-4 py-3 font-medium">行业</th>
            <th class="text-right px-4 py-3 font-medium">预估金额</th>
            <th class="text-left px-4 py-3 font-medium">最近拜访</th>
            <th class="text-left px-4 py-3 font-medium">创建于</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr
            v-for="c in filtered"
            :key="c.id"
            @click="router.push(`/admin/customers/${c.id}`)"
            class="hover:bg-ink-50 cursor-pointer transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  :style="{ backgroundColor: STAGE_MAP[c.stage].color }"
                >
                  {{ c.company.charAt(0) }}
                </div>
                <div>
                  <div class="font-medium text-ink-800">{{ c.company }}</div>
                  <div class="text-xs text-ink-500">{{ c.contact }} · {{ c.phone }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3"><StageTag :stage="c.stage" size="sm" /></td>
            <td class="px-4 py-3 text-ink-700">{{ users.byId(c.ownerId)?.name }}</td>
            <td class="px-4 py-3 text-ink-600">{{ c.industry }}</td>
            <td class="px-4 py-3 text-right font-semibold text-ink-800">
              {{ formatMoney(c.estimatedValue) }}
            </td>
            <td class="px-4 py-3 text-ink-500 text-xs">
              {{ c.lastVisitAt ? fromNow(c.lastVisitAt) : '—' }}
            </td>
            <td class="px-4 py-3 text-ink-500 text-xs">{{ formatDay(c.createdAt) }}</td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="7" class="px-4 py-12 text-center text-ink-400 text-sm">
              没有匹配的客户
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="text-xs text-ink-400 text-right">
      共 {{ filtered.length }} 位客户
    </div>
  </div>
</template>
