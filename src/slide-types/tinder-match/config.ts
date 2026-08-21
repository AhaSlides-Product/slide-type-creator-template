// Shared config (data model) for the tinder-match slide type — read by Settings
// (edit) and Canvas / Audience (render), synced via useSync and persisted under
// this key. Keyed by slideId ONLY so it survives "Reset result" / an edit.
//
// The question TITLE / DESCRIPTION are the host's own controls
// (manifest enableQuestion* → slideProps.title / description). This config holds
// only the game's own behaviour (instruction text + which extras to collect/show).

export const TINDER_CONFIG_KEY = 'tinder-match-config'

// API base for reading/writing submissions. The host normally injects `baseUrl`
// (usePresenterPlugin/useAudiencePlugin `.baseUrl`); this is the standalone
// fallback — defaults to STAGING, overridable with VITE_AHA_API_BASE.
export const API_BASE = (import.meta as any).env?.VITE_AHA_API_BASE
  || 'https://audience.dev.ahaslide.com'

// Colours for the participant avatars — cycled through the deck palette; this is
// the standalone fallback for when the host sent no palette.
export const FALLBACK_PALETTE = ['#7C4DFF', '#00B8D9', '#FF7A59', '#36B37E', '#FFAB00', '#FF5630', '#6554C0', '#FF8B00']

export const MAX_INSTRUCTION = 140
export const MAX_BIO = 80

export interface TinderConfig {
  // Instruction shown to the audience above the swipe deck.
  instruction: string
  // Ask each participant for a short bio on join (shown on their card).
  collectBio: boolean
  // Reveal the matched pairs on the presenter canvas (vs. keep them hidden until
  // the host is ready — participants always see their OWN matches on their phone).
  revealMatches: boolean
}

export const createDefaultTinderConfig = (): TinderConfig => ({
  instruction: 'Swipe right on people you\'d like to connect with — a match happens when you both like each other!',
  collectBio: true,
  revealMatches: true,
})

// Guarantee every field exists on a persisted blob before rendering.
export const migrateTinderConfig = (raw: Partial<TinderConfig> | null | undefined): TinderConfig => {
  const base = createDefaultTinderConfig()
  const next = { ...base, ...(raw || {}) }
  next.instruction = String(next.instruction ?? base.instruction).slice(0, MAX_INSTRUCTION)
  next.collectBio = Boolean(next.collectBio)
  next.revealMatches = Boolean(next.revealMatches)
  return next
}

// ── Live game events ─────────────────────────────────────────────────────────
// Every audience action is one submission whose `attributes.kind` says which:
//   profile  — { kind:'profile', name, bio }             (sent on join)
//   decision — { kind:'decision', targetId, decision }   (sent on each swipe)
// senderId is the actor's audienceId. For a decision, targetId is the audienceId
// of the person being swiped on. Canvas + Audience both read these back via
// getSubmissions polling and derive the roster + the mutual matches client-side.

export type GameEvent =
  | { kind: 'profile', senderId: string, name: string, bio: string }
  | { kind: 'decision', senderId: string, targetId: string, decision: 'like' | 'pass' }

export interface Participant {
  id: string
  name: string
  bio: string
}

// A matched pair — two participants who both liked each other. `key` is the
// order-independent pair id so the same match is never listed twice.
export interface Match {
  key: string
  a: Participant
  b: Participant
}

// Normalise ANY submission envelope into a GameEvent (or null if it isn't one of
// ours). Tolerant of the shape differences between the live-submission POST body
// and the queryable GET row (attributes vs data vs flat).
export function eventOf(submission: any): GameEvent | null {
  const a = submission?.attributes ?? submission?.data ?? submission ?? {}
  const senderId = String(submission?.senderId ?? submission?.id ?? a.senderId ?? '')
  if (!senderId) return null
  if (a.kind === 'profile') {
    return { kind: 'profile', senderId, name: String(a.name ?? ''), bio: String(a.bio ?? '') }
  }
  if (a.kind === 'decision' && a.targetId != null) {
    const decision = a.decision === 'like' ? 'like' : 'pass'
    return { kind: 'decision', senderId, targetId: String(a.targetId), decision }
  }
  return null
}

// Derive the participant roster (id → name/bio) from the profile events. Later
// profiles for the same sender win (a re-join updates their bio).
export function rosterFrom(events: GameEvent[]): Map<string, Participant> {
  const roster = new Map<string, Participant>()
  for (const e of events) {
    if (e.kind === 'profile') {
      roster.set(e.senderId, { id: e.senderId, name: e.name || 'Guest', bio: e.bio || '' })
    }
  }
  return roster
}

// The latest like/pass decision per (sender → target) — a re-swipe replaces the
// earlier one. Value is true when the sender LIKES the target.
export function likesFrom(events: GameEvent[]): Map<string, boolean> {
  const likes = new Map<string, boolean>()
  for (const e of events) {
    if (e.kind === 'decision') likes.set(`${e.senderId}->${e.targetId}`, e.decision === 'like')
  }
  return likes
}

// Order-independent key for a pair of ids.
export const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`)

// Compute every mutual-like pair from the events. A pair matches when X likes Y
// AND Y likes X. Only participants with a known profile become a listed Match.
export function matchesFrom(events: GameEvent[]): Match[] {
  const roster = rosterFrom(events)
  const likes = likesFrom(events)
  const seen = new Set<string>()
  const out: Match[] = []
  for (const [edge, liked] of likes) {
    if (!liked) continue
    const [from, to] = edge.split('->')
    if (!likes.get(`${to}->${from}`)) continue // not mutual
    const key = pairKey(from, to)
    if (seen.has(key)) continue
    seen.add(key)
    const a = roster.get(from)
    const b = roster.get(to)
    if (a && b) out.push({ key, a, b })
  }
  return out
}
