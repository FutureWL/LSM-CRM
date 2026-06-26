<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'
import { isThisMonth, formatMoney } from '@/lib/format'

const router = useRouter()
const auth = useAuthStore()
const customers = useCustomersStore()
const visits = useVisitsStore()

function logout() {
  if (confirm('确定退出当前账号吗?')) {
    auth.logout()
    router.push('/login')
  }
}

function changePassword() {
  router.push('/m/profile/password')
}

const stats = computed(() => {
  if (!auth.currentUserId) return null
  const myCustomers = customers.byOwner(auth.currentUserId)
  const myVisits = visits.bySales(auth.currentUserId)
  const monthVisits = myVisits.filter((v) => isThisMonth(v.visitedAt))
  const wonValue = myCustomers
    .filter((c) => c.stage === 'won')
    .reduce((sum, c) => sum + c.estimatedValue, 0)
  return {
    totalCustomers: myCustomers.length,
    monthVisits: monthVisits.length,
    totalVisits: myVisits.length,
    wonValue,
  }
})
</script>

<template>
  <div class="min-h-full bg-ink-50 pb-8">
    <div
      class="pt-8 pb-12 text-white relative overflow-hidden"
      style="background: linear-gradient(135deg, #10b981 0%, #047857 100%)"
    >
      <div class="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
      <div class="absolute right-12 top-8 w-16 h-16 rounded-full bg-white/5" />
      <div class="relative flex items-center gap-4 px-5">
        <img
          :src="auth.currentUser?.avatar"
          :alt="auth.currentUser?.name"
          class="w-16 h-16 rounded-full ring-4 ring-white/20"
        />
        <div>
          <div class="text-xl font-semibold">{{ auth.currentUser?.name }}</div>
          <div class="text-brand-100 text-sm mt-0.5">
            {{ auth.currentUser?.title }} · {{ auth.currentUser?.team }}
          </div>
        </div>
      </div>
    </div>

    <div class="px-3 -mt-[30px] relative z-10">
      <div class="bg-white rounded-2xl p-4 border border-ink-100 shadow-lift">
        <div class="text-xs text-ink-400 mb-1">本月已成交</div>
        <div class="text-2xl font-bold text-ink-900 mb-4">
          {{ formatMoney(stats?.wonValue ?? 0) }}
        </div>
        <div class="grid grid-cols-3 gap-3 pt-4 border-t border-ink-100">
          <div class="text-center">
            <div class="text-xl font-semibold text-ink-900">{{ stats?.totalCustomers }}</div>
            <div class="text-xs text-ink-400 mt-0.5">负责客户</div>
          </div>
          <div class="text-center border-l border-r border-ink-100">
            <div class="text-xl font-semibold text-ink-900">{{ stats?.monthVisits }}</div>
            <div class="text-xs text-ink-400 mt-0.5">本月拜访</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-semibold text-ink-900">{{ stats?.totalVisits }}</div>
            <div class="text-xs text-ink-400 mt-0.5">累计拜访</div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-3 mt-5 space-y-2">
      <button
        @click="changePassword"
        class="w-full bg-white rounded-xl p-4 border border-ink-100 text-left active:scale-[0.99] transition-transform flex items-center gap-3"
      >
        <div class="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          🔑
        </div>
        <div class="flex-1">
          <div class="text-sm font-medium text-ink-800">修改密码</div>
          <div class="text-xs text-ink-400 mt-0.5">定期更换密码更安全</div>
        </div>
        <div class="text-ink-300">›</div>
      </button>

      <button
        @click="logout"
        class="w-full bg-white rounded-xl p-4 border border-ink-100 text-left active:scale-[0.99] transition-transform flex items-center gap-3"
      >
        <div class="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
          ⏻
        </div>
        <div class="flex-1">
          <div class="text-sm font-medium text-ink-800">切换账号</div>
          <div class="text-xs text-ink-400 mt-0.5">返回登录页</div>
        </div>
        <div class="text-ink-300">›</div>
      </button>

      <div class="bg-white rounded-xl border border-ink-100 divide-y divide-ink-100">
        <div class="p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-sm">
            🏢
          </div>
          <div class="flex-1">
            <div class="text-sm text-ink-800">关于 LSM-CRM</div>
            <div class="text-xs text-ink-400 mt-0.5">v0.1.0 演示版</div>
          </div>
        </div>
        <div class="p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
            📊
          </div>
          <div class="flex-1">
            <div class="text-sm text-ink-800">演示数据</div>
            <div class="text-xs text-ink-400 mt-0.5">
              存于浏览器本地,刷新不丢失
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
