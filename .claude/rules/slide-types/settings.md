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
`HelpTooltip`, `InfoBox`, `ImageDropzone`, `ImageActionButton`, `DropdownMenu`. Class-string /
spacing tokens come from **`@/iframe/uiStandard`** (backed by `src/iframe/ui-standard.json`) —
import them instead of retyping utility strings.

## The canonical reference — the settings component library (settings-lab)

**Before you create OR update ANY settings control, open the live component library and
build against what it shows:** **https://staging-slides-marketplace.ahaslides.io/settings-lab**.
It is the interactive gallery of exactly the `@/iframe/settings` controls above — each one
rendered in its real states with the props/usage that are considered correct. It is the
source of truth for how a control LOOKS and is COMPOSED here.

- **Every setting you add or change must map to a component from settings-lab**, used the way
  the lab renders it. Match your NEED to the lab demo — this is the mapping, and it is not
  optional:

  | The field you're building | The library control (NOT a raw primitive) |
  |---|---|
  | A single-line text field | **`CountedInput`** (never a bare `<Input>`) |
  | A multi-line text field | **`CountedTextarea`** (never a bare `<Textarea>`) |
  | A number with a unit (seconds, characters, points…) | **`NumberWithUnit`** (never a bare `<InputNumber>`) |
  | A repeatable list of answers/items | **`OptionRow`** / **`QuestionList`** / **`NumberedItem`** |
  | A 2–4 way mode / layout choice | **`ModeField`** / **`CardSelect`** |
  | An image field | **`ImageDropzone`** / **`ImageActionButton`** |
  | A group heading / a lone control's label | **`SectionHeader`** (bold group) / **`SettingRow`** (single control) |
  | A dependent sub-setting shown when a toggle is on | **`SubSettingGroup`** |
  | A help glyph / an inline note | **`HelpTooltip`** (`?`) / **`InfoBox`** |

- **A raw Ant primitive where the lab has a dedicated control is a FAIL.** A bare `<Input>` for
  text or `<InputNumber>` for a number "type-checks and renders" but does NOT match the lab —
  that is exactly the miss this rule exists to stop. The plain-primitive path is reserved for
  the few shapes the lab documents as pass-throughs (`<Switch>`, `<Select>`, `<Segmented>`,
  `<RadioGroup>`) — text and numbers are NOT among them.
- **If no lab component fits**, that is the signal to reuse the nearest one or raise the gap —
  NOT to hand-roll a bespoke input. A control that doesn't exist in the lab does not belong in
  a `Settings.vue` without first being added to `@/iframe/settings` (and therefore the lab).
- **Mechanical check:** `npm run lint:settings` flags a raw `<Input>` / `<Textarea>` (ERROR →
  use `CountedInput` / `CountedTextarea`), a raw `<InputNumber>` (WARN → `NumberWithUnit` when
  it has a unit), and a root missing `SETTINGS_ROOT_CLASS`. It is a floor, not the finish line —
  the lab match + the `aha-design-settings-judge` pass below are still required.

## Where the config lives — manifest.json, not this file

Which host features a slide type opts into (`setting.enable*`) and how it registers
(`ahaConfig`: name/type/icon/urls) live in **`public/manifest.json`**, NOT in `Settings.vue`
and NOT in the per-type `config.ts`. See the `manifest` rule. `config.ts` is only the slide's
own **data model** (its option/layout shape + defaults), synced via `useSync`. So to turn on
a host title or timer you flip a flag in `manifest.json`; to add a slide-specific field you
extend `config.ts` and render a control here.

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
- **Enable only what you use.** A `setting.enable*` flag turned on "just in case" puts a
  dead control in the host editor. Every flag you set in the manifest must map to behaviour
  the slide actually uses.
- **Watch the doubled-s trap.** The close-submissions flag is
  `enableStopSubmitssionSetting` — spelled with a **doubled `ss`** (`...Submitss...`). The
  correctly-spelled single-s key is a silent no-op. Copy the key from an existing manifest
  entry rather than retyping it.
- **Transparent surface.** This panel is an iframe inside the host editor, so the host owns
  the background — paint nothing. Ink is a fixed brand token here (the surface behind it is
  the editor's app chrome, not the deck).
- **Always a top-padded root — the panel NEVER starts flush against the top.** The root
  element MUST be `:class="SETTINGS_ROOT_CLASS"` (from `@/iframe/uiStandard`), which carries the
  standard `pt-6` top padding (plus `px-4 pb-4`). The first control must have breathing room
  above it against the host's editor chrome — a settings panel with no padding-top reads as
  broken/cramped. Never swap the root for a bare `<div>` or a custom class that drops the top
  padding; if you need a different outer layout, keep `SETTINGS_ROOT_CLASS` and nest inside it.
  Between fields use `SETTINGS_FIELD_GAP_CLASS` (`mb-6`), never ad-hoc margins.
- **Ant Design Vue via the theme.** A plain `<a-input>` / `<a-switch>` / `<a-select>`
  already carries the AhaSlides storybook look (Antd is globally registered in `main.ts`) —
  use those directly and reach into `@/iframe/settings` only for composed layout or a shape
  Ant lacks. Brand tokens only, never raw hex.
- **Focus-only char counter** = counter-always-in-DOM + CSS `:focus-within`. Reuse
  `CountedInput` (single fields) / `OptionRow` (option lists) — both encode it. NEVER bind
  AntD's `:show-count` to a focus ref (it rebuilds the input DOM and drops the caret).

## Not done until the judge passes

Rendering is a draft, not a finish line. Run the finished panel through
**`aha-design-settings-judge`**, fix **every** FAIL, and re-judge until the verdict reads `OK TO SHIP`.

- **Judge against the marketplace's `origin/main`, not the local plugin copy.** That
  cache goes stale (observed hundreds of commits behind), so judging from it checks last
  month's rules. `git fetch origin` in
  `~/.claude/plugins/marketplaces/aha-claude-plugins` and
  `git show origin/main:plugins/aha-design/skills/aha-design-settings-judge/SKILL.md`,
  or refresh with `/plugin`.
- **Read every criterion; don't grep.** Walking the list is what surfaces the failures
  you didn't already suspect.
- **Prove each PASS by measuring** in the browser (`getBoundingClientRect` /
  `getComputedStyle`) and quote the number. The judge puts the burden of proof on PASS —
  a criterion you cannot verify is a FAIL, not a benefit of the doubt.
