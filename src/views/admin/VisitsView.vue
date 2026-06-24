<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVisitsStore } from '@/stores/visits'
import { useCustomersStore } from '@/stores/customers'
import { useUsersStore } from '@/stores/users'
import { formatDate, fromNow, isThisMonth } from '@/lib/format'

const router = useRouter()
const visits = useVisitsStore()
const customers = useCustomersStore()
const users = useUsersStore()

const filter = ref<'all' | 'month'>('all')
const salesFilter = ref<string>('all')

const list = computed(() => {
  let l = visits.list
  if (filter.value === 'month') l = l.filter((v) => isThisMonth(v.visitedAt))
  if (salesFilter.value !== 'all') l = l.filter((v) => v.salesId === salesFilter.value)
  return l
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-3 items-center">
      <div class="flex gap-1 p-1 bg-ink-100 rounded-lg">
        <button
          v-for="f in [{ v: 'all', l: '全部' }, { v: 'month', l: '本月' }]"
          :key="f.v"
          @click="filter = f.v as any"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          :class="
            filter === f.v
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500'
          "
        >
          {{ f.l }}
        </button>
      </div>

      <select
        v-model="salesFilter"
        class="px-3 py-1.5 rounded-md border border-ink-200 bg-white text-xs focus:border-brand-500 focus:outline-none"
      >
        <option value="all">全部销售</option>
        <option v-for="s in users.sales()" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>

      <div class="ml-auto text-xs text-ink-400">共 {{ list.length }} 条</div>
    </div>

    <div class="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">时间</th>
            <th class="text-left px-4 py-3 font-medium">客户</th>
            <th class="text-left px-4 py-3 font-medium">销售</th>
            <th class="text-left px-4 py-3 font-medium">时长</th>
            <th class="text-left px-4 py-3 font-medium">沟通要点</th>
            <th class="text-left px-4 py-3 font-medium">结果</th>
            <th class="text-left px-4 py-3 font-medium">下一步</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr
            v-for="v in list"
            :key="v.id"
            class="hover:bg-ink-50 transition-colors"
          >
            <td class="px-4 py-3 text-xs text-ink-600 whitespace-nowrap">
              <div>{{ formatDate(v.visitedAt, 'MM-DD HH:mm') }}</div>
              <div class="text-ink-400">{{ fromNow(v.visitedAt) }}</div>
            </td>
            <td class="px-4 py-3">
              <button
                @click="router.push(`/admin/customers/${v.customerId}`)"
                class="text-ink-800 hover:text-brand-600 font-medium"
              >
                {{ customers.byId(v.customerId)?.company }}
              </button>
            </td>
            <td class="px-4 py-3 text-ink-700">{{ users.byId(v.salesId)?.name }}</td>
            <td class="px-4 py-3 text-ink-600">{{ v.duration }} 分钟</td>
            <td class="px-4 py-3 text-ink-700 max-w-xs">
              <div class="line-clamp-2 leading-relaxed">{{ v.content }}</div>
            </td>
            <td class="px-4 py-3">
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="{
                  'bg-brand-50 text-brand-700': v.result === 'progress',
                  'bg-red-50 text-red-700': v.result === 'obstacle',
                  'bg-blue-50 text-blue-700': v.result === 'done',
                }"
              >
                {{
                  v.result === 'progress'
                    ? '有进展'
                    : v.result === 'obstacle'
                      ? '有阻碍'
                      : '已完成'
                }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-ink-600 max-w-xs">
              <div class="line-clamp-1">{{ v.nextStep ?? '—' }}</div>
            </td>
          </tr>
          <tr v-if="list.length === 0">
            <td colspan="7" class="px-4 py-12 text-center text-ink-400 text-sm">
              暂无拜访记录
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
