/**
 * uiStandard.ts — the machine-readable UI/UX standard for slide types.
 *
 * THE CONTRACT
 * ------------
 * `ui-standard.json` (imported below) is the SINGLE source of truth for every
 * number and class string in the standard. Three consumers read it, so a value
 * changed there propagates everywhere with nothing to keep in sync by hand:
 *
 *   1. `src/slide-types/ui-standard/` — the reference slide type. It imports
 *      these constants instead of hard-coding classes, so the living example
 *      can never drift from the spec.
 *   2. `scripts/audit-slide-types.mjs` — the deterministic CI gate. It imports
 *      the same JSON and lints every slide type against it.
 *   3. `.claude/rules/slide-types/*.md` + `.claude/skills/slide-type-ui-standard`
 *      — what an agent reads before writing UI code.
 *
 * TO CHANGE THE STANDARD: edit `ui-standard.json`, update
 * `src/slide-types/ui-standard/` so the reference still demonstrates it, then
 * run `npm run audit:slide-types`. Do NOT hard-code a competing value in a
 * slide type — that is exactly the drift this file exists to prevent.
 *
 * This module is pure data (no Vue, no DOM), so a slide type importing it stays
 * production-portable — same rule as `brandTokens.ts` / `useCounting.ts`.
 */

import standard from './ui-standard.json'

export const UI_STANDARD = standard

/** Root container for every `Settings.vue`. Never add h-full / overflow / gap. */
export const SETTINGS_ROOT_CLASS = standard.settings.rootClass

/**
 * Classes that must never reach the settings root. Each one defeats the Zoid
 * autoHeight measurement in its own way, and the iframe collapses silently.
 * Exported so the audit gate and the e2e spec assert the same list.
 */
export const SETTINGS_FORBIDDEN_ROOT_CLASSES = standard.settings.forbiddenRootClasses

/** 32px gap between top-level settings fields — the ONLY section separator. */
export const SETTINGS_FIELD_GAP_CLASS = standard.settings.fieldGapClass

/** 14px / 600 label above a control. */
export const SETTINGS_LABEL_CLASS = standard.settings.labelClass

/** Trailing info-icon beside a label — the host puts one on every settings label. */
export const SETTINGS_LABEL_ICON_CLASS = standard.settings.labelIconClass

/** 12px muted help line under a label. */
export const SETTINGS_HELP_CLASS = standard.settings.helpTextClass

/** Label-left / control-right row for a Switch. */
export const SETTINGS_TOGGLE_ROW_CLASS = standard.settings.toggleRowClass

/** A repeatable option / item row (draggable answers, cards, …). */
export const SETTINGS_OPTION_ROW_CLASS = standard.settings.optionRowClass

/** Wrapper for settings that only apply when their parent toggle is on. */
export const SETTINGS_SUB_WRAPPER_CLASS = standard.settings.subSettingWrapperClass

/** Max tooltip width in px — keeps a hint to ~2 lines. */
export const TOOLTIP_MAX_WIDTH_PX = standard.settings.tooltipMaxWidthPx

/** Inline style for a tooltip overlay, applied via `:overlay-style`. */
export const TOOLTIP_OVERLAY_STYLE = { maxWidth: `${standard.settings.tooltipMaxWidthPx}px` }

/**
 * Shared arrow config for EVERY settings tooltip, applied via `:arrow`.
 *
 * `false` — NO caret. This is deliberate and structural, not a missing tweak.
 * The settings panel is narrow (~300px), so Ant's `autoAdjustOverflow` shifts
 * the whole bubble sideways to keep it on-screen — and the caret rides with the
 * bubble as one element, so any shift drags the caret off the trigger by exactly
 * the shift distance. `pointAtCenter` + a per-trigger edge-aware placement only
 * minimises that shift for one exact trigger position; it can never eliminate it,
 * because the trigger's live x, the tooltip text length and the panel width all
 * vary at runtime (AHA-288 chased this for rounds and it always resurfaced). Ant
 * exposes no alignment/offset THEME token either, so `antTheme.ts` can't fix it.
 * Dropping the caret makes "caret not on the trigger" structurally impossible for
 * every current and future settings tooltip; the bubble still opens anchored
 * under the trigger via each tooltip's `placement`. (AHAM-458)
 */
export const TOOLTIP_ARROW = false

/** Minimum audience touch target (iOS 44pt / Android 48dp). */
export const TOUCH_TARGET_MIN_PX = standard.controls.touchTargetMinPx

/** Audience form inputs must be ≥16px or iOS Safari zooms the page on focus. */
export const FORM_INPUT_PX = standard.typography.formInputPx

/** Framed canvas root — transparent, so the host's themed stage shows through. */
export const CANVAS_FRAMED_ROOT_CLASS = standard.canvas.framedRootClass

/** The canvas's own FIXED white results surface (bundled ink only, never deck ink). */
export const CANVAS_RESULTS_SURFACE_CLASS = standard.canvas.resultsSurfaceClass

/** Track behind a result bar. The fill's width must be an honest share. */
export const CANVAS_BAR_TRACK_CLASS = standard.canvas.barTrackClass

/** Audience root — one column, width owned by the host, height by content. */
export const AUDIENCE_ROOT_CLASS = standard.audience.rootClass

/** ≥8px between tappables so a thumb can't hit two at once. */
export const AUDIENCE_TAPPABLE_GAP_CLASS = standard.audience.tappableGapClass

/** One tappable answer row, ≥44px tall. */
export const AUDIENCE_TAP_ROW_CLASS = standard.audience.tapRowClass

/** The plugin's own post-submit confirmation card. */
export const AUDIENCE_SUBMITTED_CARD_CLASS = standard.audience.submittedCardClass

// ── Transparency ────────────────────────────────────────────────────────────
// A slide type is always an iframe inside the presenter or audience app, so the
// HOST owns the background. Nothing this repo renders paints an opaque surface —
// not the document, not the view root, not a card or a row.
//
// A deck-tracking tint or outline therefore cannot be a Tailwind colour with an
// opacity modifier: Tailwind 3 emits nothing for `bg-current/10`. It is a separate
// absolutely-positioned LAYER carrying `bg-current` / `border-current` plus an
// `opacity-*` utility, so it inherits the surface's ink and follows the deck
// instead of baking in a fixed grey. Put it inside a `relative` parent.

/** Faint fill that follows the deck's ink — e.g. the track behind a result bar. */
export const DECK_TINT_LAYER_CLASS = standard.transparency.tintLayerClass

/** Hairline outline that follows the deck's ink — e.g. a tappable row's edge. */
export const DECK_OUTLINE_LAYER_CLASS = standard.transparency.outlineLayerClass

/** Background classes that must never appear on a slide-type surface. */
export const FORBIDDEN_SURFACE_CLASSES = standard.transparency.forbiddenSurfaceClasses

// ── Colour ──────────────────────────────────────────────────────────────────
// On Canvas and Audience every colour comes from the deck theme the host passes
// down — `slide.textColour`, `slide.baseColour`, `presentationColorPalette` and
// its lighter variant, `presentation.fontFamily`. A slide type does not invent
// colour. The only things allowed outside the theme are a fallback for when the
// host sent nothing, a SEMANTIC signal from brandTokens.ts, and a colour the user
// prompt explicitly asked for (say so in a comment at the call site).

/** The theme xprops a slide type reads instead of inventing colour. */
export const THEME_COLOUR_XPROPS = standard.colour.themeXprops

/** The only three ways a colour may sit outside the deck theme. */
export const COLOUR_EXCEPTIONS = standard.colour.allowedExceptions

// ── Slide attributes ────────────────────────────────────────────────────────
// A slide attribute is schema you own forever. Before adding a field, check the
// host's `enable*` settings (title, timeLimit, vote count, lock, hide-results,
// question image, join flow…) and then this config's existing fields. A new field
// is the last resort and needs a stated reason.

/** Work down this before adding a config field. */
export const SLIDE_ATTRIBUTE_DECISION_ORDER = standard.slideAttributes.decisionOrder

/** need → the host setting that already provides it (and what to read instead). */
export const HOST_SETTING_BY_NEED = standard.slideAttributes.hostSettingByNeed

// ── Settings component library ────────────────────────────────────────────────
// Composed, reusable settings controls (SectionHeader, SettingRow, OptionRow,
// CardSelect, NumberWithUnit, …) live in `src/iframe/settings` and are imported
// from `@/iframe/settings`. This is the machine-readable index of what exists and
// when to reach for each; the components themselves carry the implementation.

/** The settings component library: where it lives, what each component is for. */
export const SETTINGS_LIBRARY = standard.settingsLibrary

export type UiStandard = typeof standard
