<script setup lang="ts">
// Audience — renders the demo greeting and (when enabled) the preset answers as
// tappable buttons that submit via the SDK.
import { computed, onMounted, ref } from 'vue'
import { useAudiencePlugin, useSync } from '@aha/ui'
import { ApiClient, SlideType } from '@aha/api'
import { SubmissionSenderType, SubmissionType } from '@aha/common'
import type { DemoConfig } from './config'
import { DEMO_CONFIG_KEY, createDefaultDemoConfig, migrateDemoConfig } from './config'

const plugin: any = useAudiencePlugin()
const slideId = computed(() => Number(plugin.slideProps?.value?.id ?? 0))
const channel = computed(() => `${DEMO_CONFIG_KEY}/s${slideId.value}`)
const config = useSync<DemoConfig>(channel, createDefaultDemoConfig())

onMounted(() => {
  const persisted = plugin.slideAttributesProps?.value?.[DEMO_CONFIG_KEY]
  if (persisted) config.value = migrateDemoConfig(persisted)
})

const sending = ref('')
async function submit(label: string) {
  const slideProps = plugin.slideProps?.value ?? {}
  const presentationProps = plugin.presentationProps?.value ?? {}
  sending.value = label
  try {
    const client = new ApiClient(plugin.baseUrl?.value)
    await client.sendLiveSubmission(SlideType.SampleSlide, {
      presentationId: presentationProps.id,
      slideId: slideProps.id,
      slideVersion: slideProps.version,
      type: SubmissionType.Response,
      senderId: String(plugin.audienceId?.value ?? ''),
      senderType: SubmissionSenderType.Audience,
      attributes: { text: label },
    } as any)
    plugin.showToastSuccess?.('Sent!')
  } catch {
    plugin.showToastError?.('Failed to send')
  } finally {
    sending.value = ''
  }
}
</script>

<template>
  <div class="audience-page p-6 text-center" data-testid="audience-root">
    <h2 class="mb-1 text-xl font-semibold">{{ config.greeting }}</h2>
    <p v-if="config.description" class="mb-4 text-sm opacity-60">{{ config.description }}</p>

    <div v-if="config.collectResponses" class="mt-2 flex flex-col gap-2">
      <a-button
        v-for="opt in config.options"
        :key="opt.id"
        type="primary"
        size="large"
        :loading="sending === opt.label"
        :data-testid="`demo-answer-${opt.id}`"
        @click="submit(opt.label)"
      >
        {{ opt.label || '—' }}
      </a-button>
    </div>
    <p v-else class="text-sm opacity-60">Enjoy the slide!</p>
  </div>
</template>
