<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCustomersStore } from '@/stores/customers'
import { formatMoney, fromNow } from '@/lib/format'
import StageTag from '@/components/StageTag.vue'
import type { CustomerStage } from '@/types'
import { STAGES } from '@/lib/stage'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const auth = useAuthStore()
const customers = useCustomersStore()

const search = ref('')
const stageFilter = ref<CustomerStage | 'all'>('all')

// 新建客户弹窗
const showCreate = ref(false)
const createForm = ref({
  company: '',
  name: '',
  phone: '',
  email: '',
  industry: '',
  stage: 'new' as CustomerStage,
  amount: 0,
})
const createError = ref<string | null>(null)
const createLoading = ref(false)

function openCreate() {
  createForm.value = {
    company: '',
    name: '',
    phone: '',
    email: '',
    industry: '',
    stage: 'new',
    amount: 0,
  }
  createError.value = null
  showCreate.value = true
}

async function submitCreate() {
  if (createLoading.value) return
  if (!createForm.value.company.trim()) {
    createError.value = '请填写公司名称'
    return
  }
  if (!createForm.value.name.trim()) {
    createError.value = '请填写联系人姓名'
    return
  }
  createLoading.value = true
  createError.value = null
  try {
    // 销售创建客户时不传 ownerId，后端自动设置为当前用户
    await customers.create({
      name: createForm.value.name,
      company: createForm.value.company,
      phone: createForm.value.phone,
      email: createForm.value.email,
      industry: createForm.value.industry,
      stage: createForm.value.stage,
      amount: createForm.value.amount,
    })
    showCreate.value = false
  } catch (err: any) {
    createError.value = err?.message || '创建失败'
  } finally {
    createLoading.value = false
  }
}

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
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-ink-900">我的客户</h1>
        <p class="text-sm text-ink-500 mt-0.5">共 {{ myCustomers.length }} 位</p>
      </div>
      <button
        @click="openCreate"
        class="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
      >
        <span class="text-base">+</span>
        <span>新建客户</span>
      </button>
    </div>

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
      <div class="text-4xl mb-2 text-ink-300">
        <AppIcon name="MagnifyingGlassIcon" class="w-10 h-10" />
      </div>
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

    <!-- 新建客户弹窗 -->
    <div
      v-if="showCreate"
      class="fixed inset-0 bg-black/50 flex items-end z-50"
      @click.self="showCreate = false"
    >
      <div class="bg-white rounded-t-2xl w-full p-5 max-h-[85vh] overflow-y-auto animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-ink-900">新建客户</h3>
          <button @click="showCreate = false" class="text-ink-400 text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-ink-600 mb-1">公司名称 <span class="text-red-500">*</span></label>
            <input
              v-model="createForm.company"
              type="text"
              placeholder="请输入公司名称"
              class="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm text-ink-600 mb-1">联系人姓名 <span class="text-red-500">*</span></label>
            <input
              v-model="createForm.name"
              type="text"
              placeholder="请输入联系人姓名"
              class="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm text-ink-600 mb-1">联系电话</label>
            <input
              v-model="createForm.phone"
              type="tel"
              placeholder="手机号码"
              class="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm text-ink-600 mb-1">电子邮箱</label>
            <input
              v-model="createForm.email"
              type="email"
              placeholder="email@example.com"
              class="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm text-ink-600 mb-1">所属行业</label>
            <input
              v-model="createForm.industry"
              type="text"
              placeholder="如：互联网、金融、制造"
              class="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-sm text-ink-600 mb-1">客户阶段</label>
            <select
              v-model="createForm.stage"
              class="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            >
              <option v-for="s in STAGES" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-ink-600 mb-1">预估金额（元）</label>
            <input
              v-model.number="createForm.amount"
              type="number"
              min="0"
              placeholder="0"
              class="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div v-if="createError" class="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-red-600 text-sm">
            {{ createError }}
          </div>
          <div class="flex gap-3 pt-2">
            <button
              @click="showCreate = false"
              class="flex-1 py-3 rounded-xl border border-ink-200 text-ink-600 font-medium"
            >
              取消
            </button>
            <button
              @click="submitCreate"
              :disabled="createLoading"
              class="flex-1 py-3 rounded-xl bg-brand-500 text-white font-medium disabled:opacity-50"
            >
              {{ createLoading ? '创建中…' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
