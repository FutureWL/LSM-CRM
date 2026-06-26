<script setup lang="ts">
import { useRouter, useRoute, RouterView } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'm-home', label: '首页', icon: '🏠' },
  { name: 'm-customers', label: '客户', icon: '👥' },
  { name: 'm-visits', label: '拜访', icon: '📋' },
  { name: 'm-profile', label: '我的', icon: '👤' },
]

const active = computed(() => String(route.name ?? ''))

function onTab(name: string) {
  router.push({ name })
}
</script>

<template>
  <div class="flex flex-col h-screen w-full shrink-0 bg-ink-50 max-w-md mx-auto shadow-lift">
    <main class="flex-1 overflow-y-auto no-scrollbar safe-area-top">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <button
      v-if="route.name !== 'm-visit-new'"
      @click="router.push('/m/visit/new')"
      class="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-2xl shadow-lift hover:scale-105 active:scale-95 transition-transform z-10 flex items-center justify-center"
      style="box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.5)"
    >
      ＋
    </button>

    <nav
      v-if="route.name !== 'm-visit-new'"
      class="border-t border-ink-200 bg-white/80 backdrop-blur-md safe-area-bottom"
    >
      <div class="grid grid-cols-4">
        <button
          v-for="t in tabs"
          :key="t.name"
          @click="onTab(t.name)"
          class="flex flex-col items-center gap-0.5 py-2.5 transition-colors"
          :class="active === t.name ? 'text-brand-600' : 'text-ink-400'"
        >
          <span class="text-lg">{{ t.icon }}</span>
          <span class="text-[10px] font-medium">{{ t.label }}</span>
        </button>
      </div>
    </nav>
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
