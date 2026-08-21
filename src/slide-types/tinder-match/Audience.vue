<script setup lang="ts">
// Audience — the Tinder game on a participant's phone. Flow:
//   1) intro   — confirm you're in, add an optional short bio → sends a `profile`
//   2) swipe   — a card deck of the OTHER participants; drag/tap like or pass →
//                each sends a `decision`; a mutual like fires the host's success
//                toast ("It's a match!") and lands in "Your matches"
//   3) done    — caught up; your matches are listed
// Nothing paints a background; ink tracks the deck theme (transparent surface).
// Like/pass are SEMANTIC affordances → bundled function tokens (@aha/design),
// never the deck palette (C2). Fixed type sizes match native slide types (C5).
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { nanoid } from 'nanoid'
import { useAudiencePlugin, useSync } from '@aha/ui'
import { ApiClient, SlideType } from '@aha/api'
import { SubmissionSenderType, SubmissionType } from '@aha/common'
import { SeedTokens } from '@aha/design'
import { resolveFontFamily, useDeckFont } from '@/iframe/deckFont'
import type { GameEvent, TinderConfig } from './config'
import {
  API_BASE,
  MAX_BIO,
  TINDER_CONFIG_KEY,
  createDefaultTinderConfig,
  migrateTinderConfig,
} from './config'
import { useGame } from './useGame'

// Bundled semantic function tokens — the like/pass indicators use these (NOT the
// deck palette), so "like = success green / pass = error red" stays consistent
// with every other AhaSlides surface regardless of the deck's colours.
const LIKE = SeedTokens.colorSuccess // #16C49A
const PASS = SeedTokens.colorError // #F5222D

// autoHeight: the card deck is content-sized, so the host sizes this iframe from
// the height we report.
const plugin: any = useAudiencePlugin({ autoHeight: true })
const slideProps = computed(() => plugin.slideProps?.value ?? {})
const slideId = computed(() => Number(slideProps.value?.id ?? 0))
const slideVersion = computed(() => Number(slideProps.value?.version ?? 0))

const configChannel = computed(() => `${TINDER_CONFIG_KEY}/s${slideId.value}`)
const config = useSync<TinderConfig>(configChannel, createDefaultTinderConfig())
onMounted(() => {
  const persisted = plugin.slideAttributesProps?.value?.[TINDER_CONFIG_KEY]
  if (persisted) config.value = migrateTinderConfig(persisted)
})

// ── Identity ────────────────────────────────────────────────────────────────
const devId = nanoid(8)
const me = computed(() => String(plugin.audienceId?.value ?? devId))
const myName = computed(() => String(plugin.audienceName?.value || `Guest-${devId.slice(0, 4)}`))

// ── Theme ─────────────────────────────────────────────────────────────────────
// Ink is set ONLY when the host sent textColour — no hex fallback constant (that
// would flash to the deck's real colour when xprops loads). In standalone dev the
// root simply inherits the browser default.
const textColour = computed(() => slideProps.value?.textColour || undefined)
const deckFontName = computed(() => plugin.presentationProps?.value?.fontFamily || slideProps.value?.fontFamily)
useDeckFont(deckFontName)
const fontFamily = computed(() => resolveFontFamily(deckFontName.value))
// Avatar tint uses the DECORATIVE deck palette (not a semantic signal), keyed by
// participant id so a person keeps the same colour. Palette is deck-provided.
const palette = computed<string[]>(() => {
  const p = plugin.presentationProps?.value?.presentationColorPalette || slideProps.value?.presentationColorPalette
  return Array.isArray(p) && p.length ? p : undefined as any
})
function colourFor(id: string): string | undefined {
  const p = palette.value
  if (!p || !p.length) return undefined // dev/no-palette: fall back to currentColor tint via CSS
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return p[h % p.length]
}
const initialOf = (name: string) => (name.trim()[0] || '?').toUpperCase()

// ── Live game state ────────────────────────────────────────────────────────────
const { events, roster, matches, pushLocal } = useGame({
  slideId,
  slideVersion,
  baseUrl: computed(() => plugin.baseUrl?.value),
  accessToken: plugin.accessToken,
})

const decided = computed(() => {
  const s = new Set<string>()
  for (const e of events.value) if (e.kind === 'decision' && e.senderId === me.value) s.add(e.targetId)
  return s
})
const deck = computed(() => roster.value.filter((p) => p.id !== me.value && !decided.value.has(p.id)))
const topCard = computed(() => deck.value[0] ?? null)
const nextCard = computed(() => deck.value[1] ?? null)

const myMatches = computed(() =>
  matches.value
    .filter((m) => m.a.id === me.value || m.b.id === me.value)
    .map((m) => (m.a.id === me.value ? m.b : m.a)))

// ── Flow ───────────────────────────────────────────────────────────────────────
const stage = ref<'intro' | 'swipe'>('intro')
const bio = ref('')
const joining = ref(false)

async function sendEvent(payload: GameEvent) {
  pushLocal(payload) // optimistic: this browser sees it immediately
  const baseUrl = plugin.baseUrl?.value || API_BASE
  if (!baseUrl) return // truly standalone: local mirror only
  const sp = slideProps.value
  const pp = plugin.presentationProps?.value ?? {}
  const client = new ApiClient(baseUrl, plugin.accessToken)
  await client.sendLiveSubmission(SlideType.SampleSlide, {
    presentationId: pp.id,
    slideId: sp.id,
    slideVersion: sp.version,
    type: SubmissionType.Response,
    senderId: me.value,
    senderType: SubmissionSenderType.Audience,
    attributes: payload,
  } as any)
}

const joinBtn = ref<HTMLElement | null>(null)
function reportButtonHeight() {
  const el = joinBtn.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  plugin.onSubmitButtonHeightChange?.(rect.top + window.scrollY)
}
onMounted(() => nextTick(reportButtonHeight))

async function join() {
  if (joining.value) return
  joining.value = true
  try {
    await sendEvent({ kind: 'profile', senderId: me.value, name: myName.value, bio: config.value.collectBio ? bio.value.trim() : '' })
    stage.value = 'swipe'
  } catch {
    plugin.showToastError?.('Could not join — tap to try again.')
  } finally {
    joining.value = false
  }
}

// ── Swiping ─────────────────────────────────────────────────────────────────────
const dragX = ref(0)
const dragging = ref(false)
const flyDir = ref<0 | 1 | -1>(0) // 0 idle, 1 flying right (like), -1 left (pass)
let startX = 0
let lastX = 0
let lastT = 0
let velocity = 0 // px/ms, signed
const SWIPE_THRESHOLD = 110
const FLICK_VELOCITY = 0.5
const TILT_MAX = 8 // deg — small enough that the lifted corner fits the headroom (C11)

function onDown(e: PointerEvent) {
  if (flyDir.value || !topCard.value) return
  dragging.value = true
  startX = lastX = e.clientX
  lastT = e.timeStamp
  velocity = 0
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging.value) return
  const dt = e.timeStamp - lastT
  if (dt > 0) velocity = (e.clientX - lastX) / dt
  lastX = e.clientX
  lastT = e.timeStamp
  dragX.value = e.clientX - startX
}
function onUp() {
  if (!dragging.value) return
  dragging.value = false
  // Commit on DISTANCE past the threshold OR a quick FLICK in that direction (C12).
  const far = Math.abs(dragX.value) > SWIPE_THRESHOLD
  const flick = Math.abs(velocity) > FLICK_VELOCITY && Math.abs(dragX.value) > 24
  if (far || flick) decide(dragX.value >= 0 ? 'like' : 'pass')
  else dragX.value = 0 // spring back
}

function decide(decision: 'like' | 'pass') {
  const target = topCard.value
  if (!target || flyDir.value) return
  flyDir.value = decision === 'like' ? 1 : -1
  // Let the card fly off, THEN record — so the deck advances after the animation.
  window.setTimeout(() => {
    void sendEvent({ kind: 'decision', senderId: me.value, targetId: target.id, decision }).catch(() => {
      plugin.showToastError?.('Could not save your swipe.')
    })
    dragX.value = 0
    flyDir.value = 0
  }, 260)
}

// ── Match celebration via the host toast (no custom in-iframe overlay) ────────────
const knownMatchKeys = ref<Set<string>>(new Set())
watch(matches, (list) => {
  for (const m of list) {
    if (m.a.id !== me.value && m.b.id !== me.value) continue
    if (knownMatchKeys.value.has(m.key)) continue
    knownMatchKeys.value.add(m.key)
    const other = m.a.id === me.value ? m.b : m.a
    if (stage.value === 'swipe') plugin.showToastSuccess?.(`It's a match with ${other.name}! 🎉`)
  }
}, { deep: true })

const cardStyle = computed(() => {
  // Horizontal fly-off is the intended "off-screen" swipe; the small tilt lifts a
  // corner that the card-stage headroom already reserves for (C11).
  const x = flyDir.value ? flyDir.value * 480 : dragX.value
  const rot = Math.max(-TILT_MAX, Math.min(TILT_MAX, x / 22))
  return {
    transform: `translateX(${x}px) rotate(${rot}deg)`,
    transition: dragging.value ? 'none' : 'transform .26s ease-out',
    willChange: 'transform',
  }
})
const likeHint = computed(() => Math.max(0, Math.min(1, dragX.value / SWIPE_THRESHOLD)))
const passHint = computed(() => Math.max(0, Math.min(1, -dragX.value / SWIPE_THRESHOLD)))
</script>

<template>
  <!-- Body text is 14px / lh 1.5 to match native slide types (C5); the host paints
       the question title above this iframe (framed), so we render no title. -->
  <div
    class="tinder-audience px-5 py-6 text-sm leading-normal"
    :style="{ color: textColour, fontFamily }"
    data-testid="audience-root"
  >
    <!-- INTRO -->
    <div v-if="stage === 'intro'" class="flex flex-col items-center gap-4 text-center">
      <div
        class="flex h-20 w-20 items-center justify-center rounded-full font-semibold"
        :style="{ background: colourFor(me), color: colourFor(me) ? '#FFFFFF' : undefined, fontSize: '28px', border: colourFor(me) ? 'none' : '2px solid currentColor' }"
      >{{ initialOf(myName) }}</div>
      <p class="font-semibold" style="font-size:22px">{{ myName }}</p>
      <p class="opacity-70">{{ config.instruction }}</p>

      <div v-if="config.collectBio" class="w-full text-left">
        <label class="mb-1 block font-semibold">Add a short bio (optional)</label>
        <textarea
          v-model="bio"
          :maxlength="MAX_BIO"
          rows="2"
          placeholder="Coffee lover, React dev, ask me about hiking…"
          class="w-full resize-none rounded-lg border border-current/25 bg-current/5 px-4 py-3 outline-none placeholder:opacity-50"
          style="font-size:16px"
          data-testid="tinder-match-bio-input"
        />
        <p class="mt-1 text-right opacity-50" style="font-size:12px">{{ bio.length }}/{{ MAX_BIO }}</p>
      </div>

      <!-- Primary CTA — standard submit spec: full-width, palette bg, ~48px, testid,
           reports its height so the host can paint a sticky "scroll to submit" pill (C9). -->
      <button
        ref="joinBtn"
        type="button"
        class="mt-1 w-full rounded-lg px-6 py-3 font-semibold disabled:opacity-40"
        :style="{ background: colourFor(me) || undefined, color: colourFor(me) ? '#FFFFFF' : undefined, minHeight: '48px', border: colourFor(me) ? 'none' : '1px solid currentColor' }"
        :disabled="joining"
        data-testid="tinder-match-join-button"
        @click="join"
      >
        {{ joining ? 'Joining…' : "I'm in — start swiping" }}
      </button>
    </div>

    <!-- SWIPE -->
    <div v-else class="flex flex-col items-center gap-4">
      <p class="text-center opacity-70" style="font-size:12px">{{ config.instruction }}</p>

      <!-- card-stage reserves headroom (pt) so the tilt's lifted corner isn't clipped (C11) -->
      <div v-if="topCard" class="card-stage relative h-[360px] w-full max-w-[320px] select-none pt-3">
        <div
          v-if="nextCard"
          class="absolute inset-x-0 top-3 bottom-0 scale-[0.96] rounded-lg border border-current/15 bg-current/5"
        />
        <div
          class="absolute inset-x-0 top-3 bottom-0 touch-none overflow-hidden rounded-lg border border-current/20 bg-current/5"
          :style="cardStyle"
          data-testid="swipe-card"
          @pointerdown="onDown"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
        >
          <div class="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <div
              class="flex h-28 w-28 items-center justify-center rounded-full font-semibold"
              :style="{ background: colourFor(topCard.id), color: colourFor(topCard.id) ? '#FFFFFF' : undefined, fontSize: '44px', border: colourFor(topCard.id) ? 'none' : '2px solid currentColor' }"
            >{{ initialOf(topCard.name) }}</div>
            <p class="font-semibold" style="font-size:22px">{{ topCard.name }}</p>
            <p v-if="topCard.bio" class="opacity-70">{{ topCard.bio }}</p>
          </div>
          <!-- drag stamps: shape + word are the non-colour cue; tint is the semantic token (C6) -->
          <span
            class="pointer-events-none absolute left-4 top-4 rounded-lg border-4 px-3 py-1 font-semibold uppercase"
            style="font-size:20px;transform:rotate(-14deg)"
            :style="{ color: LIKE, borderColor: LIKE, opacity: likeHint }"
          >Like</span>
          <span
            class="pointer-events-none absolute right-4 top-4 rounded-lg border-4 px-3 py-1 font-semibold uppercase"
            style="font-size:20px;transform:rotate(14deg)"
            :style="{ color: PASS, borderColor: PASS, opacity: passHint }"
          >Nope</span>
        </div>
      </div>

      <!-- caught-up / waiting state -->
      <div v-else class="flex h-[300px] w-full max-w-[320px] flex-col items-center justify-center gap-3 text-center" data-testid="deck-empty">
        <div style="font-size:44px">💘</div>
        <p class="font-semibold">You're all caught up</p>
        <p class="opacity-60" style="font-size:12px">Waiting for more people to join…</p>
      </div>

      <!-- action buttons (accessible fallback to dragging); ≥48px touch targets (C5) -->
      <div v-if="topCard" class="flex items-center gap-8">
        <button
          type="button"
          class="flex h-14 w-14 items-center justify-center rounded-full border-2"
          style="font-size:26px"
          :style="{ borderColor: PASS, color: PASS }"
          aria-label="Pass"
          data-testid="pass-btn"
          @click="decide('pass')"
        >✕</button>
        <button
          type="button"
          class="flex h-14 w-14 items-center justify-center rounded-full"
          style="font-size:26px;color:#FFFFFF"
          :style="{ background: LIKE }"
          aria-label="Like"
          data-testid="like-btn"
          @click="decide('like')"
        >♥</button>
      </div>

      <!-- my matches so far -->
      <div v-if="myMatches.length" class="w-full max-w-[320px]" data-testid="my-matches">
        <p class="mb-2 font-semibold opacity-80">Your matches ({{ myMatches.length }})</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="p in myMatches"
            :key="p.id"
            class="flex items-center gap-2 rounded-full border border-current/20 bg-current/5 py-1 pl-1 pr-3 font-semibold"
          >
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full font-semibold"
              :style="{ background: colourFor(p.id), color: colourFor(p.id) ? '#FFFFFF' : undefined, fontSize: '12px', border: colourFor(p.id) ? 'none' : '1px solid currentColor' }"
            >{{ initialOf(p.name) }}</span>
            {{ p.name }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
