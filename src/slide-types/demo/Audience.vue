<script setup lang="ts">
// Audience surface — what a participant sees/interacts with on their device.
// Design the participant UI per `aha-design-audience`.
import { computed, ref } from 'vue'
import { useAudiencePlugin } from '@aha/ui'
import { ApiClient, SlideType } from '@aha/api'
import { SubmissionType, SubmissionSenderType } from '@aha/common'

const plugin: any = useAudiencePlugin()
const attrs = computed<any>(() => plugin.slideAttributesProps?.value ?? {})
const audienceName = computed(() => plugin.audienceName?.value ?? 'guest')

const text = ref('')
const sending = ref(false)

async function submit() {
  const slideProps = plugin.slideProps?.value ?? {}
  const presentationProps = plugin.presentationProps?.value ?? {}
  sending.value = true
  try {
    const client = new ApiClient(plugin.baseUrl?.value)
    await client.sendLiveSubmission(SlideType.SampleSlide, {
      presentationId: presentationProps.id,
      slideId: slideProps.id,
      slideVersion: slideProps.version,
      type: SubmissionType.Response,
      senderId: String(plugin.audienceId?.value ?? ''),
      senderType: SubmissionSenderType.Audience,
      attributes: { text: text.value },
    } as any)
    plugin.showToastSuccess?.('Sent!')
    text.value = ''
  } catch {
    plugin.showToastError?.('Failed to send')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="audience-page p-4" data-testid="audience-root">
    <h2 class="text-lg font-semibold">{{ attrs.greeting || 'Respond' }}</h2>
    <p class="text-sm opacity-60 mb-3">joined as {{ audienceName }}</p>

    <a-textarea v-model:value="text" :rows="3" placeholder="Type your response…" data-testid="audience-input" />
    <a-button
      type="primary"
      class="mt-3"
      name="audience_submit"
      v-aha-emit-action
      :loading="sending"
      @click="submit"
      data-testid="audience-submit"
    >
      Submit
    </a-button>
  </div>
</template>
