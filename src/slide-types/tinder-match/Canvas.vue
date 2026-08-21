<script setup lang="ts">
// Presenter Canvas — the live matchmaking board: how many people are in, how many
// likes have flown, and the matched pairs. Nothing paints a background (the host
// owns it); all ink tracks the deck theme.
import { computed, onMounted } from 'vue'
import { usePresenterPlugin, useSync } from '@aha/ui'
import { resolveFontFamily, useDeckFont } from '@/iframe/deckFont'
import type { TinderConfig } from './config'
import {
  FALLBACK_PALETTE,
  TINDER_CONFIG_KEY,
  createDefaultTinderConfig,
  migrateTinderConfig,
} from './config'
import { useGame } from './useGame'

const plugin: any = usePresenterPlugin()
const slideProps = computed(() => plugin.slideProps?.value ?? {})
const slideId = computed(() => Number(slideProps.value?.id ?? 0))
// Live data is keyed by (slideId, slideVersion): a "Reset result"/edit bumps the
// version → a fresh empty game. Read the version REACTIVELY. Config stays
// slideId-only so the author's setup survives a reset.
const slideVersion = computed(() => Number(slideProps.value?.version ?? 0))
const configChannel = computed(() => `${TINDER_CONFIG_KEY}/s${slideId.value}`)
const config = useSync<TinderConfig>(configChannel, createDefaultTinderConfig())

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  const persisted = attrs?.[TINDER_CONFIG_KEY]
  if (persisted) config.value = migrateTinderConfig(persisted)
})

const { roster, matches, likeCount } = useGame({
  slideId,
  slideVersion,
  baseUrl: computed(() => plugin.baseUrl?.value),
  accessToken: plugin.accessToken,
})

// ── Theme ─────────────────────────────────────────────────────────────────────
const textColour = computed(() => slideProps.value?.textColour || '#1a1a2e')
const deckFontName = computed(() => plugin.presentationProps?.value?.fontFamily || slideProps.value?.fontFamily)
useDeckFont(deckFontName)
const fontFamily = computed(() => resolveFontFamily(deckFontName.value))
const palette = computed<string[]>(() => {
  const p = plugin.presentationProps?.value?.presentationColorPalette || slideProps.value?.presentationColorPalette
  return Array.isArray(p) && p.length ? p : FALLBACK_PALETTE
})
function colourFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return palette.value[h % palette.value.length]
}
const initialOf = (name: string) => (name.trim()[0] || '?').toUpperCase()

const reveal = computed(() => Boolean(config.value.revealMatches))
</script>

<template>
  <div
    class="tinder-canvas h-full w-full flex flex-col px-[5%] py-[4%]"
    :style="{ color: textColour, fontFamily }"
    data-testid="canvas-root"
  >
    <!-- No title/description here: the host renders them. -->

    <!-- Live stats -->
    <div class="mb-[3vh] flex items-center gap-[4vw]">
      <div class="flex flex-col">
        <span class="text-[4.5vw] font-extrabold leading-none tabular-nums">{{ roster.length }}</span>
        <span class="text-[1.3vw] uppercase tracking-wide opacity-60">players</span>
      </div>
      <div class="flex flex-col">
        <span class="text-[4.5vw] font-extrabold leading-none tabular-nums">{{ likeCount }}</span>
        <span class="text-[1.3vw] uppercase tracking-wide opacity-60">likes sent</span>
      </div>
      <div class="flex flex-col">
        <!-- prompt-requested Tinder accent for the match count -->
        <span class="text-[4.5vw] font-extrabold leading-none tabular-nums" style="color:#FF4458">{{ matches.length }}</span>
        <span class="text-[1.3vw] uppercase tracking-wide opacity-60">matches</span>
      </div>
    </div>

    <!-- Matched pairs -->
    <div class="min-h-0 flex-1">
      <template v-if="reveal">
        <div v-if="matches.length" class="grid grid-cols-2 gap-[1.6vh] lg:grid-cols-3" data-testid="match-grid">
          <div
            v-for="m in matches"
            :key="m.key"
            class="flex items-center justify-center gap-[1vw] rounded-2xl border border-current/15 bg-current/5 px-[1.4vw] py-[1.4vh]"
            data-testid="match-pair"
          >
            <span class="flex items-center gap-[0.6vw]">
              <span class="flex h-[4vh] w-[4vh] items-center justify-center rounded-full text-[1.6vw] font-bold text-white" :style="{ background: colourFor(m.a.id) }">{{ initialOf(m.a.name) }}</span>
              <span class="text-[1.6vw] font-semibold">{{ m.a.name }}</span>
            </span>
            <span class="text-[2vw]" style="color:#FF4458">❤</span>
            <span class="flex items-center gap-[0.6vw]">
              <span class="flex h-[4vh] w-[4vh] items-center justify-center rounded-full text-[1.6vw] font-bold text-white" :style="{ background: colourFor(m.b.id) }">{{ initialOf(m.b.name) }}</span>
              <span class="text-[1.6vw] font-semibold">{{ m.b.name }}</span>
            </span>
          </div>
        </div>
        <!-- waiting for the first match -->
        <div v-else class="flex h-full flex-col items-center justify-center gap-[1.5vh] text-center" data-testid="canvas-waiting">
          <div class="text-[6vw]">💘</div>
          <p class="text-[2vw] font-semibold">{{ roster.length ? 'Swiping… no matches yet' : 'Waiting for players to join' }}</p>
          <p class="text-[1.4vw] opacity-60">A match appears here when two people like each other</p>
        </div>
      </template>

      <!-- matches hidden by the presenter -->
      <div v-else class="flex h-full flex-col items-center justify-center gap-[1.5vh] text-center" data-testid="canvas-hidden">
        <div class="text-[6vw]">🔒</div>
        <p class="text-[2vw] font-semibold">{{ matches.length }} match{{ matches.length === 1 ? '' : 'es' }} so far — hidden</p>
        <p class="text-[1.4vw] opacity-60">Turn on “Reveal matches” to show them on screen</p>
      </div>
    </div>
  </div>
</template>
