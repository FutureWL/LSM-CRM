<script setup lang="ts">
import type { CustomerStage } from '@/types'
import { STAGE_MAP } from '@/lib/stage'
import { computed } from 'vue'

const props = defineProps<{ stage: CustomerStage; size?: 'sm' | 'md' }>()

const s = computed(() => STAGE_MAP[props.stage])
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full font-medium"
    :class="size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'"
    :style="{ color: s.color, backgroundColor: s.bg }"
  >
    <span
      class="w-1.5 h-1.5 rounded-full"
      :style="{ backgroundColor: s.color }"
    />
    {{ s.label }}
  </span>
</template>
