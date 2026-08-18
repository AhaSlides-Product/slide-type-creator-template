<script setup lang="ts">
// Presenter Canvas surface — the slide as shown on the presenting stage.
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePresenterPlugin, useSync } from '@aha/ui'
import { useSlideImage } from '@/composables/useSlideImage'

const route = useRoute()
const slideId = computed(() => String(route.params.slideId ?? ''))

// Host bridge (typed hooks; kept loose here for the skeleton).
const plugin: any = usePresenterPlugin()
const slideProps = computed<any>(() => plugin.slideProps?.value ?? {})

// Shared config written by the Settings surface (same-browser BroadcastChannel).
const greeting = useSync<string>(computed(() => `greeting-${slideId.value}`), '')
const { imageUrl } = useSlideImage(slideId)

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  if (attrs?.greeting) greeting.value = attrs.greeting
})
</script>

<template>
  <div class="canvas-page p-6" data-testid="canvas-root">
    <h1 class="text-2xl font-semibold">{{ greeting || 'Your slide' }}</h1>
    <img v-if="imageUrl" :src="imageUrl" alt="" class="max-w-full mt-4 rounded-lg" />
    <p class="mt-3 text-sm opacity-60">slide {{ slideId }} · lang {{ slideProps.language ?? '—' }}</p>
  </div>
</template>
