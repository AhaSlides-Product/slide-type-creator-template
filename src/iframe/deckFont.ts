import { watch, type Ref } from 'vue'

/**
 * Deck-font handling for a plugin slide type.
 *
 * The host forwards only the font *name* via `presentationProps.fontFamily`.
 * A slide type is a **cross-origin iframe**, and an iframe does NOT inherit its
 * parent document's `@font-face` rules — so setting `font-family: <Name>` inline
 * (what a surface does to track the deck) resolves to the system-ui fallback and
 * the slide silently renders in the wrong face. Symptom: a deck set to Nunito /
 * Poppins / any non-bundled family shows plain system sans on the canvas AND the
 * audience phone, even though `slideProps.fontFamily` is correct. (AHAM-385)
 *
 * Two pieces, always used together on a surface that renders text:
 *   1. `resolveFontFamily(name)` — the CSS value: the deck family + a robust
 *      system-sans fallback chain, so a missing/unloadable face degrades to a
 *      clean sans-serif rather than the browser's default serif.
 *   2. `useDeckFont(nameRef)` — actually LOADS the deck's webfont into this
 *      iframe (Google Fonts) so `resolveFontFamily`'s first choice can resolve.
 */

/** Bundled app default — already loaded, never needs a Google Fonts request. */
const BUNDLED_FALLBACK = 'Plus Jakarta Sans'
const PRECONNECT_ID = 'aha-fonts-preconnect'
const requested = new Set<string>()

/** First family of a stack, stripped of quotes: `"Nunito", sans-serif` → `Nunito`. */
function baseFamily(raw: string): string {
  return raw.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
}

/**
 * Resolve the deck font name into a CSS font stack with a robust system-sans
 * fallback. Pass the RAW `presentationProps.fontFamily` (the bare name). If the
 * name already carries commas (a full stack) it is returned unchanged.
 */
export function resolveFontFamily(deckFont: string | undefined): string {
  const base = (deckFont ?? '').trim() || BUNDLED_FALLBACK
  if (base.includes(',')) return base
  return `'${base}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
}

function ensurePreconnect(): void {
  if (document.getElementById(PRECONNECT_ID)) return
  const api = document.createElement('link')
  api.id = PRECONNECT_ID
  api.rel = 'preconnect'
  api.href = 'https://fonts.googleapis.com'
  const files = document.createElement('link')
  files.rel = 'preconnect'
  files.href = 'https://fonts.gstatic.com'
  files.crossOrigin = 'anonymous'
  document.head.append(api, files)
}

function loadDeckFont(raw: string | undefined): void {
  const family = baseFamily(raw ?? '')
  if (!family || requested.has(family)) return
  requested.add(family)
  // The bundled default is already available — no request needed.
  if (family.toLowerCase() === BUNDLED_FALLBACK.toLowerCase()) return
  ensurePreconnect()
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  // Google Fonts v1 `css` API silently drops any weight a family lacks (the v2
  // `css2` API can reject the whole request), so this stays robust across
  // arbitrary deck fonts. Cover the weights the slide UIs actually use. A
  // non-Google / custom family simply 404s and leaves the fallback in place.
  const name = encodeURIComponent(family).replace(/%20/g, '+')
  link.href = `https://fonts.googleapis.com/css?family=${name}:400,500,600,700,800&display=swap`
  link.dataset.ahaDeckFont = family
  document.head.appendChild(link)
}

/**
 * Watch the deck font name and load it into this iframe. Pass the RAW
 * `presentationProps.fontFamily` (the bare name), not the resolved CSS stack.
 * Idempotent per family; safe to call on every surface that renders text.
 */
export function useDeckFont(fontFamily: Ref<string | undefined>): void {
  watch(fontFamily, loadDeckFont, { immediate: true })
}
