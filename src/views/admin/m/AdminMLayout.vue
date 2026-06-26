<script setup lang="ts">
import { useRouter, useRoute, RouterView } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'a-dashboard', label: '首页', icon: '📊' },
  { name: 'a-customers', label: '客户', icon: '👥' },
  { name: 'a-visits', label: '拜访', icon: '📋' },
  { name: 'a-sales', label: '销售', icon: '🏆' },
]

const active = computed(() => String(route.name ?? ''))

function onTab(name: string) {
  router.push({ name })
}
</script>

<template>
  <div class="flex flex-col h-screen bg-ink-50 max-w-md mx-auto shadow-lift">
    <main class="flex-1 overflow-y-auto no-scrollbar safe-area-top">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <nav class="border-t border-ink-200 bg-white/80 backdrop-blur-md safe-area-bottom">
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
