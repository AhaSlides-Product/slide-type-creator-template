<script setup lang="ts">
// Horse Race — presenter canvas: a lane per horse, position driven by the shared
// progress the audience taps up (same-browser useSync; a real deploy would drive
// this from live submissions / subscribeTopic).
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePresenterPlugin, useSync } from '@aha/ui'

const route = useRoute()
const plugin: any = usePresenterPlugin()
const slideProps = computed<any>(() => plugin.slideProps?.value ?? {})
const slideId = computed(() => String(slideProps.value?.id ?? route.params.slideId ?? 'preview'))

const title = useSync<string>(computed(() => `hr-title-${slideId.value}`), 'On your marks!')
const horses = useSync<number>(computed(() => `hr-horses-${slideId.value}`), 4)
const progress = useSync<number[]>(computed(() => `hr-progress-${slideId.value}`), [])

const lanes = computed<number[]>(() => {
  const n = horses.value || 4
  const p = progress.value || []
  return Array.from({ length: n }, (_, i) => Math.min(100, p[i] ?? 0))
})
const leader = computed(() => lanes.value.indexOf(Math.max(...lanes.value)))

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  if (attrs?.title) title.value = attrs.title
  if (attrs?.horses) horses.value = Number(attrs.horses)
})
</script>

<template>
  <div class="canvas-page p-6" data-testid="canvas-root">
    <h1 class="text-2xl font-semibold mb-6">{{ title }}</h1>
    <div class="flex flex-col gap-3">
      <div v-for="(pos, i) in lanes" :key="i" class="relative h-9 rounded-full bg-black/5">
        <span class="absolute right-2 top-1.5 text-sm opacity-40">🏁</span>
        <span
          class="absolute top-1 text-2xl transition-all duration-300"
          :class="{ 'scale-125': i === leader }"
          :style="{ left: `calc(${pos}% - 12px)` }"
        >🐎</span>
      </div>
    </div>
  </div>
</template>
