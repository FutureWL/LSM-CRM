<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'
import {
  ChartBarIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  ShieldCheckIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const menus = [
  { name: 'admin-dashboard', label: '仪表盘', icon: ChartBarIcon },
  { name: 'admin-customers', label: '客户', icon: UsersIcon },
  { name: 'admin-visits', label: '拜访记录', icon: ClipboardDocumentListIcon },
  { name: 'admin-sales', label: '销售团队', icon: TrophyIcon },
  { name: 'admin-users', label: '账号管理', icon: ShieldCheckIcon },
]

const currentTitle = computed(() => {
  return menus.find((m) => m.name === route.name)?.label ?? '管理后台'
})

function onLogout() {
  auth.logout()
  router.push('/login')
}

function onChangePassword() {
  router.push({ name: 'admin-profile-password' })
}
</script>

<template>
  <div class="flex h-screen bg-ink-50">
    <aside class="w-60 bg-ink-900 text-white flex flex-col flex-shrink-0">
      <div class="px-5 py-5 border-b border-ink-800">
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold"
          >
            L
          </div>
          <div>
            <div class="font-semibold text-sm tracking-tight">LSM-CRM</div>
            <div class="text-ink-400 text-[10px]">销售管理后台</div>
          </div>
        </div>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1">
        <RouterLink
          v-for="m in menus"
          :key="m.name"
          :to="{ name: m.name }"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
          :class="
            route.name === m.name
              ? 'bg-brand-500/15 text-brand-300 font-medium'
              : 'text-ink-300 hover:bg-ink-800 hover:text-white'
          "
        >
          <component :is="m.icon" class="w-5 h-5" />
          <span>{{ m.label }}</span>
        </RouterLink>
      </nav>

      <div class="px-3 py-3 border-t border-ink-800">
        <div class="flex items-center gap-2.5 px-2 py-2">
          <img
            :src="auth.currentUser?.avatar"
            :alt="auth.currentUser?.name"
            class="w-8 h-8 rounded-full"
          />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ auth.currentUser?.name }}</div>
            <div class="text-ink-400 text-[10px] truncate">{{ auth.currentUser?.title }}</div>
          </div>
          <button
            @click="onChangePassword"
            class="text-ink-400 hover:text-white p-1"
            title="修改密码"
          >
            <KeyIcon class="w-4 h-4" />
          </button>
          <button
            @click="onLogout"
            class="text-ink-400 hover:text-white p-1"
            title="退出"
          >
            <ArrowRightOnRectangleIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col overflow-hidden">
      <header class="h-14 bg-white border-b border-ink-200 flex items-center px-6">
        <h1 class="text-lg font-semibold text-ink-900">{{ currentTitle }}</h1>
        <div class="ml-auto flex items-center gap-3 text-xs text-ink-500">
          <span>数据更新于 {{ new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-6">
        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
