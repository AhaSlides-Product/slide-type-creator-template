<script setup lang="ts">
// Audience — vote on the poll. Single-choice (tap one) or multiple-choice (pick up
// to maxVotes then Submit). Optimistic lock that ROLLS BACK if the server rejects.
// Nothing paints a background; ink tracks the deck theme.
import { computed, onMounted, ref } from 'vue'
import { useAudiencePlugin, useSync } from '@aha/ui'
import { ApiClient, SlideType } from '@aha/api'
import { SubmissionSenderType, SubmissionType } from '@aha/common'
import type { PollConfig } from './config'
import { POLL_CONFIG_KEY, createDefaultPollConfig, migratePollConfig } from './config'

const plugin: any = useAudiencePlugin()
const slideProps = computed(() => plugin.slideProps?.value ?? {})
const slideId = computed(() => Number(slideProps.value?.id ?? 0))
const configChannel = computed(() => `${POLL_CONFIG_KEY}/s${slideId.value}`)
const votesChannel = computed(() => `test-poll-votes/s${slideId.value}`)

const config = useSync<PollConfig>(configChannel, createDefaultPollConfig())
const votes = useSync<Record<string, number>>(votesChannel, {})

onMounted(() => {
  const persisted = plugin.slideAttributesProps?.value?.[POLL_CONFIG_KEY]
  if (persisted) config.value = migratePollConfig(persisted)
})

const title = computed(() => slideProps.value?.title || '')
const textColour = computed(() => slideProps.value?.textColour || '#1a1a2e')

const selected = ref<Set<string>>(new Set())
const submitted = ref(false)
const sending = ref(false)
const errorMsg = ref('')

const maxVotes = computed(() => (config.value.allowMultiple ? Math.max(1, config.value.maxVotes) : 1))
const atLimit = computed(() => selected.value.size >= maxVotes.value)

function toggle(id: string) {
  if (submitted.value || sending.value) return
  errorMsg.value = ''
  if (config.value.allowMultiple) {
    if (selected.value.has(id)) selected.value.delete(id)
    else if (!atLimit.value) selected.value.add(id)
    selected.value = new Set(selected.value)
  } else {
    selected.value = new Set([id])
    submit() // single-choice submits on tap
  }
}

async function submit() {
  const ids = [...selected.value]
  if (!ids.length || submitted.value || sending.value) return
  sending.value = true
  errorMsg.value = ''
  // Optimistic: lock the UI immediately.
  submitted.value = true

  try {
    const sp = slideProps.value
    const pp = plugin.presentationProps?.value ?? {}
    const client = new ApiClient(plugin.baseUrl?.value)
    await client.sendLiveSubmission(SlideType.SampleSlide, {
      presentationId: pp.id,
      slideId: sp.id,
      slideVersion: sp.version,
      type: SubmissionType.Response,
      senderId: String(plugin.audienceId?.value ?? ''),
      senderType: SubmissionSenderType.Audience,
      attributes: { optionIds: ids },
    } as any)
    // Local live tally for the canvas (same-browser preview + best-effort).
    const next = { ...votes.value }
    ids.forEach((id) => { next[id] = (next[id] || 0) + 1 })
    votes.value = next
  } catch {
    // ROLL BACK the lock — only the server call unwinds it (no local mirror here).
    submitted.value = false
    errorMsg.value = 'Could not submit — tap to try again.'
    plugin.showToastError?.('Failed to submit')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="poll-audience px-5 py-6" :style="{ color: textColour }" data-testid="audience-root">
    <h2 v-if="title" class="mb-4 text-lg font-semibold leading-snug">{{ title }}</h2>

    <div class="flex flex-col gap-3">
      <button
        v-for="opt in config.options"
        :key="opt.id"
        type="button"
        class="poll-option flex items-center gap-3 rounded-2xl border border-current/20 px-4 py-3 text-left text-base transition-all"
        :class="[
          selected.has(opt.id) ? 'selected border-current bg-current/10 font-semibold' : '',
          (submitted && !selected.has(opt.id)) ? 'opacity-40' : '',
        ]"
        :disabled="submitted || sending"
        :data-testid="`poll-option-${opt.id}`"
        @click="toggle(opt.id)"
      >
        <span
          v-if="config.allowMultiple"
          class="check flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-current/40"
          :class="selected.has(opt.id) ? 'bg-current text-white' : ''"
        >
          <svg v-if="selected.has(opt.id)" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <img
          v-if="opt.imageUrl"
          :src="opt.imageUrl"
          alt=""
          class="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
        <span class="flex-1">{{ opt.label || '—' }}</span>
      </button>
    </div>

    <button
      v-if="config.allowMultiple && !submitted"
      type="button"
      class="submit mt-5 w-full rounded-2xl border border-current px-4 py-3 text-base font-semibold disabled:opacity-40"
      :disabled="selected.size === 0 || sending"
      data-testid="poll-submit"
      @click="submit"
    >
      {{ sending ? 'Submitting…' : `Submit${selected.size ? ` (${selected.size})` : ''}` }}
    </button>

    <div v-if="submitted" class="mt-5 flex items-center justify-center gap-2 text-sm font-medium" data-testid="poll-submitted">
      <span class="flex h-6 w-6 items-center justify-center rounded-full" style="background:#36B37E;color:#fff">
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      Answer submitted
    </div>
    <p v-if="errorMsg" class="mt-3 text-center text-sm" style="color:#FF5630">{{ errorMsg }}</p>
  </div>
</template>
