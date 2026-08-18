<script setup lang="ts">
// Horse Race — editor settings: race title + number of horses.
import { computed, onMounted, watch } from 'vue'
import { usePresenterPlugin, useSync } from '@aha/ui'
import { debounce } from 'lodash-es'

const plugin: any = usePresenterPlugin({ autoHeight: true })
const slideId = computed(() => String(plugin.slideProps?.value?.id ?? 'preview'))

const title = useSync<string>(computed(() => `hr-title-${slideId.value}`), 'On your marks!')
const horses = useSync<number>(computed(() => `hr-horses-${slideId.value}`), 4)

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  if (attrs?.title) title.value = attrs.title
  if (attrs?.horses) horses.value = Number(attrs.horses)
})

const persist = debounce(() => {
  plugin.upsertSlideAttributeAction?.({ slideId: slideId.value, attributeKey: 'title', attributeValue: title.value })
  plugin.upsertSlideAttributeAction?.({ slideId: slideId.value, attributeKey: 'horses', attributeValue: String(horses.value) })
}, 500)
watch([title, horses], persist)
</script>

<template>
  <div class="settings-page p-4 flex flex-col gap-4" data-testid="settings-root">
    <a-typography-title :level="5">Horse race</a-typography-title>

    <div class="flex flex-col gap-1">
      <label class="text-sm">Race title</label>
      <a-input v-model:value="title" name="hr_title" v-aha-emit-action data-testid="hr-title-input" />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm">Number of horses</label>
      <a-input-number v-model:value="horses" :min="2" :max="8" name="hr_horses" v-aha-emit-action data-testid="hr-horses-input" />
    </div>
  </div>
</template>
