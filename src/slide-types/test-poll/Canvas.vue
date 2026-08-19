<script setup lang="ts">
// Presenter Canvas — the poll question + a live horizontal-bar result per option.
// Nothing paints a background (the host owns it); ink tracks the deck theme.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePresenterPlugin, useSync } from '@aha/ui'
import { ApiClient } from '@aha/api'
import type { PollConfig } from './config'
import { API_BASE, POLL_CONFIG_KEY, createDefaultPollConfig, migratePollConfig } from './config'

const plugin: any = usePresenterPlugin()
const slideProps = computed(() => plugin.slideProps?.value ?? {})
const slideId = computed(() => Number(slideProps.value?.id ?? 0))
const configChannel = computed(() => `${POLL_CONFIG_KEY}/s${slideId.value}`)
const votesChannel = computed(() => `test-poll-votes/s${slideId.value}`)

const config = useSync<PollConfig>(configChannel, createDefaultPollConfig())
// Same-browser dev fallback tally (BroadcastChannel); real counts come from the
// backend via getSubmissions polling below.
const votes = useSync<Record<string, number>>(votesChannel, {})
// { [optionId]: count } tallied from the server — the cross-device source of truth.
const serverVotes = ref<Record<string, number>>({})
const hasServer = ref(false)

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  const persisted = attrs?.[POLL_CONFIG_KEY]
  if (persisted) config.value = migratePollConfig(persisted)
})

// Poll the backend for votes and tally per option. Works without a counting
// handler (unlike subscribeTopic) — each audience vote is a stored submission
// carrying { optionIds }. Deduped by sender so a re-vote doesn't double-count.
let pollTimer: ReturnType<typeof setInterval> | null = null
// Read the option ids out of a submission regardless of exact envelope shape.
function optionIdsOf(s: any): string[] {
  const a = s?.attributes ?? s?.data ?? s ?? {}
  if (Array.isArray(a.optionIds)) return a.optionIds.map(String)
  if (Array.isArray(a.vote)) return a.vote.map(String)
  if (a.optionId != null) return [String(a.optionId)]
  return []
}
async function pollVotes() {
  const baseUrl = plugin.baseUrl?.value || API_BASE
  if (!baseUrl || !slideId.value) return
  try {
    const client = new ApiClient(baseUrl, plugin.accessToken?.value)
    // No slideVersion filter — count every submission for the slide (avoids a
    // version mismatch silently dropping votes).
    const subs = await client.getSubmissions({ slideId: slideId.value })
    const bySender = new Map<string, string[]>()
    for (const s of (subs || []) as any[]) {
      const ids = optionIdsOf(s)
      if (ids.length) bySender.set(String(s.senderId ?? s.id), ids)
    }
    const tally: Record<string, number> = {}
    for (const ids of bySender.values()) ids.forEach((id) => { tally[id] = (tally[id] || 0) + 1 })
    serverVotes.value = tally
    hasServer.value = true
    // eslint-disable-next-line no-console
    console.debug('[test-poll] getSubmissions', { slideId: slideId.value, count: (subs || []).length, tally })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug('[test-poll] getSubmissions failed', e)
  }
}
onMounted(() => {
  pollVotes()
  pollTimer = setInterval(pollVotes, 2000)
})
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

// Server tally cross-device; the useSync tally is the same-browser dev fallback.
const tally = computed<Record<string, number>>(() => (hasServer.value ? serverVotes.value : votes.value))

// Host-provided question surface (enabled via the manifest enable* flags).
const title = computed(() => slideProps.value?.title || '')
const description = computed(() => slideProps.value?.description || '')
const image = computed(() => slideProps.value?.image?.large || slideProps.value?.image?.url || '')
const hideResults = computed(() => Boolean(slideProps.value?.hideResult))
// Host "show correct answer" reveal, only meaningful when the poll marks correct options.
const showCorrect = computed(() => config.value.hasCorrectAnswer && Boolean(slideProps.value?.showCorrectOption))

// Ink + marks from the deck theme; a fallback only for when the host sent nothing.
const textColour = computed(() => slideProps.value?.textColour || '#1a1a2e')
const palette = computed<string[]>(() => {
  const p = plugin.presentationProps?.value?.presentationColorPalette
    || slideProps.value?.presentationColorPalette
  return Array.isArray(p) && p.length ? p : ['#7C4DFF', '#00B8D9', '#FF7A59', '#36B37E', '#FFAB00', '#FF5630']
})
const fontFamily = computed(() => plugin.presentationProps?.value?.fontFamily || slideProps.value?.fontFamily || 'inherit')

const total = computed(() => Object.values(tally.value).reduce((a, b) => a + (b || 0), 0))
const rows = computed(() => config.value.options.map((opt, i) => {
  const count = tally.value[opt.id] || 0
  const pct = total.value > 0 ? Math.round((count / total.value) * 100) : 0
  return { ...opt, count, pct, colour: palette.value[i % palette.value.length] }
}))
</script>

<template>
  <div
    class="poll-canvas h-full w-full flex flex-col justify-center px-[6%] py-[4%]"
    :style="{ color: textColour, fontFamily }"
    data-testid="canvas-root"
  >
    <h1 v-if="title" class="text-[3.2vw] font-bold leading-tight mb-2">{{ title }}</h1>
    <p v-if="description" class="text-[1.6vw] opacity-70 mb-3">{{ description }}</p>
    <img
      v-if="image"
      :src="image"
      alt=""
      class="mb-4 max-h-[28vh] w-auto self-start rounded-2xl object-contain"
    />

    <div class="flex flex-col gap-[1.6vh]">
      <div
        v-for="row in rows"
        :key="row.id"
        class="poll-row transition-opacity"
        :class="showCorrect && !row.correct ? 'opacity-40' : ''"
        data-testid="poll-result-row"
      >
        <div class="mb-1 flex items-center justify-between text-[1.5vw]">
          <span class="flex items-center gap-2 font-semibold">
            <img
              v-if="row.imageUrl"
              :src="row.imageUrl"
              alt=""
              class="h-[3vh] w-[3vh] rounded-md object-cover"
            />
            <span v-if="showCorrect" class="text-[1.6vw]">{{ row.correct ? '✅' : '❌' }}</span>
            {{ row.label || '—' }}
          </span>
          <span class="tabular-nums opacity-90">{{ row.count }} · {{ hideResults ? '' : row.pct + '%' }}</span>
        </div>
        <!-- Track = deck-tint layer (bg-current + low opacity), fill = a real mark colour. -->
        <div class="h-[2.4vh] w-full overflow-hidden rounded-full bg-current/10">
          <div
            class="h-full rounded-full transition-[width] duration-500 ease-out"
            :style="{ width: (hideResults ? 0 : row.pct) + '%', background: row.colour, minWidth: row.count > 0 && !hideResults ? '0.6rem' : '0' }"
          />
        </div>
      </div>
    </div>

    <p class="mt-[2.4vh] text-[1.3vw] opacity-60">
      {{ total }} vote{{ total === 1 ? '' : 's' }}
    </p>
  </div>
</template>
