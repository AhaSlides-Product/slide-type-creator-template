<script setup lang="ts">
// Editor Settings surface — the Content-tab panel for this slide type.
// Build the editor options following the `aha-design-settings` skill.
import { computed, onMounted, watch } from 'vue'
import { usePresenterPlugin, useSync } from '@aha/ui'
import { debounce } from 'lodash-es'
import { useSlideImage } from '@/composables/useSlideImage'

// `autoHeight` lets the settings iframe report its height to the host.
const plugin: any = usePresenterPlugin({ autoHeight: true })
const slideId = computed(() => String(plugin.slideProps?.value?.id ?? ''))

// A setting = a useSync ref (instant to canvas/audience) + a debounced persist.
const greeting = useSync<string>(computed(() => `greeting-${slideId.value}`), '')
const { imageUrl } = useSlideImage(slideId)

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  if (attrs?.greeting) greeting.value = attrs.greeting
})

const persist = debounce((value: string) => {
  plugin.upsertSlideAttributeAction?.({
    slideId: slideId.value,
    attributeKey: 'greeting',
    attributeValue: value,
  })
}, 500)
watch(greeting, (value) => persist(value))

async function pickImage() {
  const res = await plugin.openUploadImageModal?.()
  if (res?.url) imageUrl.value = res.url
}
</script>

<template>
  <div class="settings-page p-4" data-testid="settings-root">
    <a-typography-title :level="5">Slide settings</a-typography-title>

    <div class="flex flex-col gap-1 mb-4">
      <label class="text-sm">Greeting</label>
      <a-input
        v-model:value="greeting"
        name="greeting"
        v-aha-emit-action
        placeholder="e.g. Welcome!"
        data-testid="settings-greeting-input"
      />
    </div>

    <a-button name="settings_set_image" v-aha-emit-action @click="pickImage" data-testid="settings-image-button">
      Set image
    </a-button>
    <img v-if="imageUrl" :src="imageUrl" alt="" class="max-w-full mt-4 rounded-lg" />
  </div>
</template>
