<script setup lang="ts">
defineProps<{ title?: string; description?: string; icon?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-ink-400">
    <div class="text-5xl mb-3 opacity-50">{{ icon ?? '📭' }}</div>
    <div class="text-sm font-medium text-ink-600">{{ title ?? '暂无数据' }}</div>
    <div v-if="description" class="text-xs text-ink-400 mt-1">{{ description }}</div>
  </div>
</template>
