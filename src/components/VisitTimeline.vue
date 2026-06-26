<script setup lang="ts">
import type { Visit, Customer } from '@/types'
import { formatDate, fromNow } from '@/lib/format'
import { computed } from 'vue'
import { useCustomersStore } from '@/stores/customers'

const props = defineProps<{ visits: Visit[]; showCustomer?: boolean }>()
const customers = useCustomersStore()

const enriched = computed(() =>
  props.visits.map((v) => ({
    visit: v,
    customer: customers.byId(v.customerId) as Customer | undefined,
  })),
)

const RESULT_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  progress: { label: '有进展', color: '#10b981', bg: '#d1fae5' },
  obstacle: { label: '有阻碍', color: '#ef4444', bg: '#fee2e2' },
  done: { label: '已完成', color: '#0ea5e9', bg: '#e0f2fe' },
}

const TYPE_LABEL: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  normal: { label: '普通', icon: '·', color: '#94a3b8', bg: '#f1f5f9' },
  collection: { label: '催款', icon: '💵', color: '#f59e0b', bg: '#fef3c7' },
  warranty: { label: '质保回访', icon: '🛡️', color: '#0ea5e9', bg: '#e0f2fe' },
  introduction: { label: '商机介绍', icon: '📈', color: '#10b981', bg: '#d1fae5' },
}
</script>

<template>
  <div class="relative">
    <div v-if="enriched.length === 0" class="text-ink-400 text-sm text-center py-8">
      暂无拜访记录
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="(item, i) in enriched"
        :key="item.visit.id"
        class="relative pl-8 fade-in"
        :style="{ animationDelay: `${i * 30}ms` }"
      >
        <div
          class="absolute left-2 top-2 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-brand-100"
        />
        <div
          v-if="i < enriched.length - 1"
          class="absolute left-[14px] top-5 w-px h-full bg-ink-200"
        />

        <div class="bg-white rounded-xl border border-ink-200 p-4 shadow-card">
          <div class="flex items-start justify-between mb-2">
            <div>
              <div v-if="showCustomer && item.customer" class="font-medium text-ink-800">
                {{ item.customer.company }} · {{ item.customer.contact }}
              </div>
              <div class="text-xs text-ink-500 mt-0.5">
                {{ formatDate(item.visit.visitedAt) }} ·
                <span class="text-ink-400">{{ fromNow(item.visit.visitedAt) }}</span>
                · {{ item.visit.duration }} 分钟
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span
                v-if="item.visit.visitType && item.visit.visitType !== 'normal'"
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :style="{
                  color: TYPE_LABEL[item.visit.visitType]?.color,
                  backgroundColor: TYPE_LABEL[item.visit.visitType]?.bg,
                }"
              >
                {{ TYPE_LABEL[item.visit.visitType]?.icon }}
                {{ TYPE_LABEL[item.visit.visitType]?.label }}
              </span>
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :style="{
                  color: RESULT_LABEL[item.visit.result]?.color,
                  backgroundColor: RESULT_LABEL[item.visit.result]?.bg,
                }"
              >
                {{ RESULT_LABEL[item.visit.result]?.label }}
              </span>
            </div>
          </div>
          <div class="text-sm text-ink-700 leading-relaxed">{{ item.visit.content }}</div>
          <div
            v-if="item.visit.nextStep || item.visit.nextFollowUpAt"
            class="mt-3 pt-3 border-t border-ink-100 text-xs text-ink-500"
          >
            <span class="text-brand-600">下一步:</span>
            {{ item.visit.nextStep }}
            <span v-if="item.visit.nextFollowUpAt" class="ml-2 text-ink-400">
              ({{ formatDate(item.visit.nextFollowUpAt, 'MM-DD') }})
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
