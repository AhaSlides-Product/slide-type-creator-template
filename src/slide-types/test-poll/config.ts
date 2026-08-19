import { nanoid } from 'nanoid'

// Shared config for the test-poll slide type — read by Settings (edit) and
// Canvas / Audience (render), synced via useSync and persisted under this key.
// The question TITLE / DESCRIPTION / IMAGE are NOT stored here — they are the
// host's own controls (manifest enableQuestion* flags → slideProps.title /
// description / image). This config holds only the answer options + poll behaviour.
export const POLL_CONFIG_KEY = 'test-poll-config'

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 10

// Bar colours cycle through the deck palette; this is the standalone fallback.
export const FALLBACK_PALETTE = ['#7C4DFF', '#00B8D9', '#FF7A59', '#36B37E', '#FFAB00', '#FF5630', '#6554C0', '#FF8B00']

export interface PollOption {
  id: string
  label: string
  imageUrl: string
  correct: boolean
}

export interface PollConfig {
  options: PollOption[]
  // Single-choice (radio) vs multiple-choice (checkbox).
  allowMultiple: boolean
  // When allowMultiple, how many options one participant may pick (1..options).
  maxVotes: number
  // Mark correct answer(s) — reveals ✓/✗ on the canvas/audience when the host
  // "show correct answer" control is used.
  hasCorrectAnswer: boolean
}

export const createOption = (label = '', imageUrl = '', id = nanoid(6)): PollOption => ({
  id,
  label,
  imageUrl,
  correct: false,
})

// STABLE ids for the default options so every surface agrees on them before the
// useSync config channel converges (with no persisted config — e.g. the standalone
// dev preview — random ids would diverge and the per-option vote tally wouldn't
// match). Options the user adds later still get a unique nanoid.
export const createDefaultPollConfig = (): PollConfig => ({
  options: [
    createOption('Option 1', '', 'opt-1'),
    createOption('Option 2', '', 'opt-2'),
    createOption('Option 3', '', 'opt-3'),
  ],
  allowMultiple: false,
  maxVotes: 1,
  hasCorrectAnswer: false,
})

// Guarantee every field/array exists on a persisted blob before rendering.
export const migratePollConfig = (raw: Partial<PollConfig> | null | undefined): PollConfig => {
  const base = createDefaultPollConfig()
  const next = { ...base, ...(raw || {}) }
  next.options = Array.isArray(next.options) && next.options.length
    ? next.options.map((o) => ({
      id: o.id || nanoid(6),
      label: o.label || '',
      imageUrl: o.imageUrl || '',
      correct: Boolean(o.correct),
    }))
    : base.options
  next.maxVotes = Math.max(1, Math.min(Number(next.maxVotes) || 1, next.options.length))
  return next
}
