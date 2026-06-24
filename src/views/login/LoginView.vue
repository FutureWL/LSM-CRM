<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'

const router = useRouter()
const auth = useAuthStore()
const usersStore = useUsersStore()

const adminMode = ref<'desktop' | 'mobile'>('desktop')

function pickLogin(userId: string, role: 'sales' | 'admin') {
  auth.login(userId)
  if (role === 'admin') {
    router.push(adminMode.value === 'mobile' ? '/a/dashboard' : '/admin/dashboard')
  } else {
    router.push('/m/home')
  }
}

const sales = computed(() => usersStore.list.filter((u) => u.role === 'sales'))
const admins = computed(() => usersStore.list.filter((u) => u.role === 'admin'))
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 relative overflow-hidden"
  >
    <div
      class="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
    />
    <div
      class="absolute bottom-0 left-0 w-80 h-80 bg-brand-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"
    />

    <div class="relative w-full max-w-2xl">
      <div class="text-center mb-10">
        <div class="inline-flex items-center gap-3 mb-4">
          <div
            class="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl font-bold shadow-glow"
          >
            L
          </div>
          <div class="text-left">
            <div class="text-white text-2xl font-semibold tracking-tight">LSM-CRM</div>
            <div class="text-ink-400 text-xs">销售管理系统 · 演示版</div>
          </div>
        </div>
        <h1 class="text-white text-3xl font-semibold mb-2">欢迎使用</h1>
        <p class="text-ink-400 text-sm">选择一个演示角色快速进入</p>
      </div>

      <div class="mb-6">
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="text-ink-400 text-xs uppercase tracking-wider">
            管理后台 · {{ admins.length }} 个账号
          </div>
          <div class="flex gap-1 p-0.5 bg-ink-800/60 rounded-lg border border-ink-700/50">
            <button
              @click="adminMode = 'desktop'"
              :class="
                adminMode === 'desktop'
                  ? 'bg-brand-500 text-white'
                  : 'text-ink-400 hover:text-ink-200'
              "
              class="px-2.5 py-1 text-[10px] rounded-md font-medium transition-colors"
            >🖥️ 桌面版</button>
            <button
              @click="adminMode = 'mobile'"
              :class="
                adminMode === 'mobile'
                  ? 'bg-brand-500 text-white'
                  : 'text-ink-400 hover:text-ink-200'
              "
              class="px-2.5 py-1 text-[10px] rounded-md font-medium transition-colors"
            >📱 移动版</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="u in admins"
            :key="u.id"
            @click="pickLogin(u.id, u.role)"
            class="group bg-ink-800/60 hover:bg-ink-800 border border-ink-700/50 hover:border-brand-500/50 rounded-2xl p-4 text-left transition-all hover:shadow-glow"
          >
            <div class="flex items-center gap-3">
              <img :src="u.avatar" :alt="u.name" class="w-11 h-11 rounded-full" />
              <div class="flex-1">
                <div class="text-white font-medium">{{ u.name }}</div>
                <div class="text-ink-400 text-xs">{{ u.title }}</div>
              </div>
              <div class="text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                {{ adminMode === 'mobile' ? '进入移动版 →' : '进入 →' }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <div>
        <div class="text-ink-400 text-xs uppercase tracking-wider mb-3 px-1">
          移动端销售 · {{ sales.length }} 个账号
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="u in sales"
            :key="u.id"
            @click="pickLogin(u.id, u.role)"
            class="group bg-ink-800/60 hover:bg-ink-800 border border-ink-700/50 hover:border-brand-500/50 rounded-2xl p-4 text-left transition-all hover:shadow-glow"
          >
            <div class="flex items-center gap-3">
              <img :src="u.avatar" :alt="u.name" class="w-11 h-11 rounded-full" />
              <div class="flex-1">
                <div class="text-white font-medium">{{ u.name }}</div>
                <div class="text-ink-400 text-xs">{{ u.team }} · {{ u.title }}</div>
              </div>
              <div class="text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                进入 →
              </div>
            </div>
          </button>
        </div>
      </div>

      <div class="text-center text-ink-500 text-xs mt-8">
        演示数据存于浏览器本地,刷新不丢失
      </div>
    </div>
  </div>
</template>
