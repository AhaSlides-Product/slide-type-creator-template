<script setup lang="ts">
// Presenter Canvas — renders the demo slide from the shared config.
import { computed, onMounted } from 'vue'
import { usePresenterPlugin, useSync } from '@aha/ui'
import type { DemoConfig } from './config'
import { DEMO_CONFIG_KEY, createDefaultDemoConfig, migrateDemoConfig } from './config'

const plugin: any = usePresenterPlugin()
const slideId = computed(() => Number(plugin.slideProps?.value?.id ?? 0))
const channel = computed(() => `${DEMO_CONFIG_KEY}/s${slideId.value}`)
const config = useSync<DemoConfig>(channel, createDefaultDemoConfig())

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  const persisted = attrs?.[DEMO_CONFIG_KEY]
  if (persisted) config.value = migrateDemoConfig(persisted)
})

const alignClass = computed(() => ({
  left: 'items-start text-left',
  center: 'items-center text-center',
  card: 'items-center text-center',
}[config.value.layout] || 'items-center text-center'))
</script>

<template>
  <div class="canvas-page p-8 h-full flex flex-col justify-center" data-testid="canvas-root">
    <div
      class="flex flex-col gap-3"
      :class="[alignClass, config.layout === 'card' ? 'demo-card' : '']"
    >
      <h1 class="text-4xl font-bold">{{ config.greeting }}</h1>
      <p v-if="config.description" class="text-lg opacity-70">{{ config.description }}</p>
      <img
        v-if="config.showImage && config.imageUrl"
        :src="config.imageUrl"
        alt=""
        class="mt-2 max-h-64 max-w-md rounded-xl"
      />
    </div>
  </div>
</template>

<style scoped>
.demo-card {
  align-self: center;
  padding: 32px 48px;
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.04);
}
</style>
