---
paths:
  - "src/slide-types/**/Settings.vue"
---

# Building a slide-type Settings surface (right-panel editor)

**Load `aha-design:aha-design-settings`** first — the settings-panel UX rules: setting
names as noun phrases, help text in a `?` tooltip (never an `ⓘ` info icon), spacing-only
grouping (NO dividers, NO card around plain settings), dependent sub-settings hidden when
off and indented when shown, plan-gating (crown → paywall), dangerous actions last +
separated + confirm modal.

Build from the composed controls in **`@/iframe/settings`** — don't hand-roll inputs:
`SectionHeader`, `SettingRow`, `SubSettingGroup`, `OptionRow`, `CardSelect`, `ModeField`,
`CountedInput` / `CountedTextarea`, `NumberWithUnit`, `NumberedItem`, `QuestionList`,
`HelpTooltip`, `InfoBox`, `ImageDropzone`, `ImageActionButton`. Class-string / spacing
tokens come from **`@/iframe/uiStandard`** (backed by `src/iframe/ui-standard.json`) —
import them instead of retyping utility strings.

## Data

- `usePresenterPlugin({ autoHeight: true })` — pass `autoHeight` **explicitly**; the host
  sizes this iframe from the height the plugin reports.
- Persist each setting with **both**: `useSync(...)` for instant cross-iframe reactivity
  **and** a debounced `upsertSlideAttributeAction({ slideId, attributeKey, attributeValue })`
  for durable storage. Hydrate from `getSlideAttributesAction(slideId)` on mount. Don't
  invent a localStorage scheme.

## Make-or-break invariants

- **Reuse the host's native controls — don't rebuild them.** Title, description, timer,
  lock-submission, vote count, full-screen, audience-join are host-rendered when the
  matching `ahaConfig.setting.enable*` flag is on in the slide type's `public/manifest.json`
  entry. Turn the flag on and read `slideProps.*` — adding a duplicate `<a-input>` title in
  the panel is a blocking duplication. A new slide-attribute field is the **last resort**:
  (1) host flag → (2) derive from an existing config field → (3) only then a new field.
- **Transparent surface.** This panel is an iframe inside the host editor, so the host owns
  the background — paint nothing. Ink is a fixed brand token here (the surface behind it is
  the editor's app chrome, not the deck).
- **Ant Design Vue via the theme.** A plain `<a-input>` / `<a-switch>` / `<a-select>`
  already carries the AhaSlides storybook look (Antd is globally registered in `main.ts`) —
  use those directly and reach into `@/iframe/settings` only for composed layout or a shape
  Ant lacks. Brand tokens only, never raw hex.
- **Focus-only char counter** = counter-always-in-DOM + CSS `:focus-within`. Reuse
  `CountedInput` (single fields) / `OptionRow` (option lists) — both encode it. NEVER bind
  AntD's `:show-count` to a focus ref (it rebuilds the input DOM and drops the caret).

Self-check the finished panel with **`aha-design-settings-judge`**.
