<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import type { CustomerStage, VisitResult, VisitType } from '@/types'
import { STAGES } from '@/lib/stage'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const customers = useCustomersStore()
const visits = useVisitsStore()

const customerId = ref<string>('')
const visitedAt = ref<string>(dayjs().format('YYYY-MM-DDTHH:mm'))
const duration = ref<number>(60)
const content = ref<string>('')
const result = ref<VisitResult>('progress')
const visitType = ref<VisitType>('normal')
const nextFollowUpAt = ref<string>('')
const nextStep = ref<string>('')
const stageChange = ref<CustomerStage | ''>('')
const submitting = ref(false)

const myCustomers = computed(() =>
  auth.currentUserId
    ? customers.byOwner(auth.currentUserId).sort((a, b) =>
        a.company.localeCompare(b.company, 'zh'),
      )
    : [],
)

const selectedCustomer = computed(() => customers.byId(customerId.value))

onMounted(() => {
  const fromQuery = route.query.customerId
  if (typeof fromQuery === 'string') customerId.value = fromQuery
  const fromType = route.query.type
  if (typeof fromType === 'string') {
    if (['normal', 'collection', 'warranty', 'introduction'].includes(fromType)) {
      visitType.value = fromType as VisitType
    }
  }
})

async function submit() {
  if (!customerId.value) {
    alert('请选择客户')
    return
  }
  if (!content.value.trim()) {
    alert('请填写沟通要点')
    return
  }
  submitting.value = true
  try {
    await visits.add({
      customerId: customerId.value,
      // salesmanId 由后端从 session 取，前端不传
      visitedAt: new Date(visitedAt.value).toISOString(),
      durationMin: duration.value,
      content: content.value.trim(),
      result: result.value,
      type: visitType.value,
      nextStep: nextStep.value.trim() || undefined,
    })
    if (stageChange.value && selectedCustomer.value) {
      customers.setStage(customerId.value, stageChange.value)
    }
    router.push('/m/visits')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-full bg-ink-50 pb-32">
    <header
      class="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-ink-100 px-4 py-3 flex items-center gap-3"
    >
      <button
        @click="router.back()"
        class="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-100"
      >
        ←
      </button>
      <h1 class="text-base font-semibold text-ink-900 flex-1">新建拜访</h1>
    </header>

    <form @submit.prevent="submit" class="px-4 py-4 space-y-4 fade-in">
      <div class="bg-white rounded-2xl p-4 border border-ink-100">
        <label class="text-xs text-ink-500 mb-2 block">客户</label>
        <select
          v-model="customerId"
          class="w-full px-3 py-2.5 rounded-lg border border-ink-200 focus:border-brand-500 focus:outline-none text-sm bg-white"
        >
          <option value="" disabled>请选择客户</option>
          <option v-for="c in myCustomers" :key="c.id" :value="c.id">
            {{ c.company }} · {{ c.contact }}
          </option>
        </select>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-ink-100">
        <label class="text-xs text-ink-500 mb-2 block">拜访类型</label>
        <div class="grid grid-cols-4 gap-2">
          <button
            type="button"
            v-for="t in [
              { v: 'normal', l: '普通', c: '#94a3b8' },
              { v: 'collection', l: '催款', c: '#f59e0b' },
              { v: 'warranty', l: '质保回访', c: '#0ea5e9' },
              { v: 'introduction', l: '商机介绍', c: '#10b981' },
            ]"
            :key="t.v"
            @click="visitType = t.v as VisitType"
            class="py-2 rounded-lg text-xs font-medium border transition-all"
            :class="
              visitType === t.v
                ? 'border-transparent text-white'
                : 'border-ink-200 text-ink-600 bg-white'
            "
            :style="visitType === t.v ? { backgroundColor: t.c } : {}"
          >
            {{ t.l }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-2xl p-4 border border-ink-100">
          <label class="text-xs text-ink-500 mb-2 block">拜访时间</label>
          <input
            v-model="visitedAt"
            type="datetime-local"
            class="w-full px-2 py-1.5 rounded-lg border border-ink-200 focus:border-brand-500 focus:outline-none text-sm"
          />
        </div>
        <div class="bg-white rounded-2xl p-4 border border-ink-100">
          <label class="text-xs text-ink-500 mb-2 block">时长(分钟)</label>
          <input
            v-model.number="duration"
            type="number"
            min="5"
            step="5"
            class="w-full px-2 py-1.5 rounded-lg border border-ink-200 focus:border-brand-500 focus:outline-none text-sm"
          />
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-ink-100">
        <label class="text-xs text-ink-500 mb-2 block">
          沟通要点 <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="content"
          rows="5"
          placeholder="本次拜访沟通内容、客户反应、关键信息..."
          class="w-full px-3 py-2 rounded-lg border border-ink-200 focus:border-brand-500 focus:outline-none text-sm resize-none"
        />
      </div>

      <div class="bg-white rounded-2xl p-4 border border-ink-100">
        <label class="text-xs text-ink-500 mb-2 block">拜访结果</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            v-for="r in [
              { v: 'progress', l: '有进展', c: '#10b981' },
              { v: 'obstacle', l: '有阻碍', c: '#ef4444' },
              { v: 'done', l: '已完成', c: '#0ea5e9' },
            ]"
            :key="r.v"
            @click="result = r.v as VisitResult"
            class="py-2.5 rounded-lg text-sm font-medium border transition-all"
            :class="
              result === r.v
                ? 'border-transparent text-white'
                : 'border-ink-200 text-ink-600 bg-white'
            "
            :style="result === r.v ? { backgroundColor: r.c } : {}"
          >
            {{ r.l }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-ink-100">
        <label class="text-xs text-ink-500 mb-2 block">更新客户阶段(可选)</label>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            @click="stageChange = ''"
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="
              stageChange === ''
                ? 'border-brand-500 text-brand-600 bg-brand-50'
                : 'border-ink-200 text-ink-600'
            "
          >
            不变
          </button>
          <button
            type="button"
            v-for="s in STAGES"
            :key="s.value"
            @click="stageChange = s.value"
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="
              stageChange === s.value
                ? 'text-white border-transparent'
                : 'border-ink-200 text-ink-600'
            "
            :style="stageChange === s.value ? { backgroundColor: s.color } : {}"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-ink-100 space-y-3">
        <div>
          <label class="text-xs text-ink-500 mb-2 block">下一步行动</label>
          <input
            v-model="nextStep"
            type="text"
            placeholder="例:下周安排技术对接"
            class="w-full px-3 py-2 rounded-lg border border-ink-200 focus:border-brand-500 focus:outline-none text-sm"
          />
        </div>
        <div>
          <label class="text-xs text-ink-500 mb-2 block">下次跟进时间</label>
          <input
            v-model="nextFollowUpAt"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-ink-200 focus:border-brand-500 focus:outline-none text-sm"
          />
        </div>
      </div>
    </form>

    <div
      class="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gradient-to-t from-white via-white to-transparent"
    >
      <button
        @click="submit"
        :disabled="submitting"
        class="w-full py-3.5 rounded-2xl text-white font-semibold shadow-lift active:scale-[0.99] transition-transform disabled:opacity-60"
        style="background: linear-gradient(135deg, #10b981 0%, #047857 100%)"
      >
        {{ submitting ? '提交中…' : '提交拜访记录' }}
      </button>
    </div>
  </div>
</template>
