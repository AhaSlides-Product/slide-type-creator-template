// Shared live-game state for tinder-match, used by both Canvas and Audience.
//
// The cross-device source of truth is the submission store: every join/swipe is a
// live submission, and we poll getSubmissions({ slideId, slideVersion }) and derive
// the roster + matches client-side (no counting handler needed — same path as
// test-poll). A same-browser useSync mirror carries optimistic writes instantly and
// makes the standalone dev preview work across tabs with no host.
//
// Version-scoping (slideId, slideVersion) is what makes "Reset result" restart the
// game: the host bumps slide.version, we query the new version, the roster reads
// empty. slideVersion is read REACTIVELY so it self-heals after the prop settles.
import { computed, onMounted, onUnmounted, ref, type ComputedRef } from 'vue'
import { useSync } from '@aha/ui'
import { ApiClient } from '@aha/api'
import { API_BASE, eventOf, matchesFrom, rosterFrom, type GameEvent, type Match, type Participant } from './config'

interface GameOptions {
  slideId: ComputedRef<number>
  slideVersion: ComputedRef<number>
  baseUrl: ComputedRef<string | undefined>
  accessToken: string | undefined
}

export function useGame(opts: GameOptions) {
  // Same-browser optimistic mirror (BroadcastChannel). Version-scoped like the
  // live data so a reset clears it too.
  const localChannel = computed(() => `tinder-match-events/s${opts.slideId.value}-v${opts.slideVersion.value}`)
  const localEvents = useSync<GameEvent[]>(localChannel, [])

  // Events fetched from the backend (the cross-device truth).
  const serverEvents = ref<GameEvent[]>([])

  // Union server + local optimistic events, then dedupe: profiles by sender,
  // decisions by (sender→target), latest wins. Works in dev (server empty → local
  // carries it) and prod (server truth + not-yet-flushed optimistic writes), with
  // no double counting because decisions collapse by their pair edge.
  const events = computed<GameEvent[]>(() => {
    const merged = [...serverEvents.value, ...localEvents.value]
    const profiles = new Map<string, GameEvent>()
    const decisions = new Map<string, GameEvent>()
    for (const e of merged) {
      if (e.kind === 'profile') profiles.set(e.senderId, e)
      else decisions.set(`${e.senderId}->${e.targetId}`, e)
    }
    return [...profiles.values(), ...decisions.values()]
  })

  const roster = computed<Participant[]>(() => [...rosterFrom(events.value).values()])
  const matches = computed<Match[]>(() => matchesFrom(events.value))
  const likeCount = computed(() =>
    events.value.filter((e) => e.kind === 'decision' && e.decision === 'like').length)

  // Append an event to the local mirror right away (optimistic), so this browser
  // reflects it before the poll catches up.
  function pushLocal(e: GameEvent) {
    localEvents.value = [...localEvents.value, e]
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null
  async function poll() {
    const baseUrl = opts.baseUrl.value || API_BASE
    if (!baseUrl || !opts.slideId.value) return
    try {
      // accessToken is a PLAIN string on the plugin — no `.value`.
      const client = new ApiClient(baseUrl, opts.accessToken)
      const subs = await client.getSubmissions(
        opts.slideVersion.value
          ? { slideId: opts.slideId.value, slideVersion: opts.slideVersion.value }
          : { slideId: opts.slideId.value },
      )
      const parsed: GameEvent[] = []
      for (const s of (subs || []) as any[]) {
        const e = eventOf(s)
        if (e) parsed.push(e)
      }
      serverEvents.value = parsed
      // eslint-disable-next-line no-console
      console.debug('[tinder-match] getSubmissions', { slideId: opts.slideId.value, events: parsed.length })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('[tinder-match] getSubmissions failed', e)
    }
  }

  onMounted(() => {
    poll()
    pollTimer = setInterval(poll, 2000)
  })
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

  return { events, roster, matches, likeCount, pushLocal }
}
