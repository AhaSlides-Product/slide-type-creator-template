<script setup lang="ts">
// Horse Race — audience: tap to move your horse forward.
import { computed } from 'vue'
import { useAudiencePlugin, useSync } from '@aha/ui'

const plugin: any = useAudiencePlugin()
const slideId = computed(() => String(plugin.slideProps?.value?.id ?? 'preview'))

const horses = useSync<number>(computed(() => `hr-horses-${slideId.value}`), 4)
const progress = useSync<number[]>(computed(() => `hr-progress-${slideId.value}`), [])

const myHorse = computed(() => {
  const id = Number(plugin.audienceId?.value ?? 0)
  return Math.abs(id) % (horses.value || 4)
})

function run() {
  const n = horses.value || 4
  const arr = progress.value && progress.value.length === n
    ? [...progress.value]
    : Array.from({ length: n }, () => 0)
  arr[myHorse.value] = Math.min(100, (arr[myHorse.value] ?? 0) + 5)
  progress.value = arr
}
</script>

<template>
  <div class="audience-page p-6 text-center" data-testid="audience-root">
    <p class="mb-4 text-sm opacity-60">You are horse #{{ myHorse + 1 }} 🐎</p>
    <a-button type="primary" size="large" name="hr_run" v-aha-emit-action @click="run" data-testid="hr-run-button">
      Chạy! 🐎
    </a-button>
    <p class="mt-4 text-lg">{{ Math.round(progress[myHorse] ?? 0) }}%</p>
  </div>
</template>
