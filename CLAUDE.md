# aha-slide-types-public — Claude guidance

A Vue 3 + TS app that hosts AhaSlides **slide types**. Each slide type runs inside the
AhaSlides host as three iframe surfaces — **Canvas** (presenter stage), **Settings**
(editor panel), **Audience** (participant device) — consuming the `@aha/*` SDK
(`ui`/`api`/`common`/`db`). The host fills `window.xprops` via zoid; the same code runs
here and in the real product.

- **Token-free SDK.** `@aha/*` installs from public **GitHub Release tarballs** of
  `aha-slide-plugin` (URLs in `package.json`) — no `.npmrc`, no `GH_TOKEN`, no npmjs.
- **One folder per slide type.** `src/slide-types/<type>/{Canvas,Settings,Audience}.vue`.
  `SurfaceHost.vue` + the router resolve the surface by the route `:type` param, so a new
  folder is a new slide type with **no router edit**. `demo/` is the reference template.
- **Public declaration.** `public/manifest.json` is the list of slide types this deploy
  offers (served at `<domain>/manifest.json`) — see the schema below.
- **Design skills.** `.claude/settings.json` enables the public `aha-design` plugin.
  Per-surface rules in `.claude/rules/slide-types/{canvas,settings,audience,handler,manifest}.md`
  fire automatically when you edit that file — each says which `aha-design-*` skill to load,
  which `@/iframe/settings` components to use, and the transparent-surface / deck-theme-ink /
  reuse-host-capabilities / submission-lock / quiz-lobby invariants (mirrors how
  slide-type-creator wires aha-design, adapted to this repo's SDK + manifest).
- **Config vs data model.** A slide type's **config** — its host registration (`ahaConfig`)
  and the `setting.enable*` feature opt-ins — lives in **`public/manifest.json`**, not in
  code. The per-type **`config.ts`** is only the slide's own **data model** (option/layout
  shape + defaults, synced via `useSync`). Turning a host title/timer on is a manifest edit;
  adding a slide-specific field is a `config.ts` + control edit.
- **Data & runtime skill.** Before wiring live data (counts/votes/submissions), the submit
  flow, cross-surface sync, or testing against the real host, load
  `.claude/skills/slide-type-data-and-runtime` — it encodes the SDK Ref-vs-plain field
  contract (`accessToken` is a plain string; `baseUrl`/`slideProps` are Refs), the
  getSubmissions-poll vs counting-handler options, optimistic-write + stable-id rules, and
  the HTTPS/CORS/cert setup. It exists because each of those, done wrong, produced a silent
  zero-count chart with no on-screen error.

## Setup — the aha-design plugin is a PREREQUISITE, load it FIRST

**Do this before any slide-type work.** The per-surface rules and the required design
JUDGES (`aha-design-settings-judge` / `-canvas-judge` / `-audience-judge`) live in the
`aha-design` plugin. Building a surface without it means shipping unjudged UI — the exact
gap that produced the wrong-controls / missing-padding misses.

The repo already declares it in `.claude/settings.json` (`extraKnownMarketplaces:
aha-design-public` + `enabledPlugins: aha-design@aha-design-public`), so on a first open
Claude Code should offer to trust & install it. If the plugin is NOT active in the session
(the `aha-design-*` skills don't appear in the Skill tool), install it explicitly, then
**RESTART the session** — plugin changes only take effect next session:

```bash
claude plugin marketplace add AhaSlides-Product/aha-design-public
claude plugin install aha-design@aha-design-public
# then restart the Claude Code session so the aha-design-* skills + judges load
```

Verify with `claude plugin list` — `aha-design@aha-design-public` must read **enabled**.
Do NOT start building or claim a surface done until the plugin is loaded and its judge has
run; "type-check + build pass" is not a substitute for the judge.

## Creating a slide type from a prompt

When someone says e.g. **"tạo cho tôi 1 slide đua ngựa" / "make me a horse-race slide"**,
produce a NEW slide type — do NOT edit `demo/`. Steps:

1. **Pick a slug** (kebab-case) for `type`/`pinKey`, e.g. `horse-race`. If the brief is a
   vague one-liner with no clear OUTCOME or REFERENCE, ask ONE short clarifying question first.
2. **Scaffold** `src/slide-types/<slug>/` by copying the three files from
   `src/slide-types/demo/`. The router auto-dispatches `/<slug>/{canvas,settings,audience}`.
3. **Build the mechanic** (reuse host capabilities before building your own — see below):
   - `Settings.vue` — each setting is a `useSync` ref keyed by slideId, persisted (debounced)
     via `upsertSlideAttributeAction({ slideId, attributeKey, attributeValue })`. Opt into
     the host's native title / timer / lock / full-screen etc. through the manifest
     `ahaConfig.setting.enable*` flags rather than rebuilding them.
   - `Canvas.vue` — render the presenter view from the synced config + `slideProps`; for a
     live slide, read realtime values with `subscribeTopic` / `getValues`.
   - `Audience.vue` — the participant UI; send answers with
     `new ApiClient(baseUrl).sendLiveSubmission(SlideType.X, payload)`.
4. **Declare it** in `public/manifest.json`: append an entry (schema below) with
   `type` = the slug, **`pinKey` = `developer-<slug>`** (prefix required; keep the top-level
   `pinKey` and `ahaConfig.pinKey` equal), `canvasUrl` = `/<slug>/canvas`,
   `audienceUrl` = `/<slug>/audience`, `editorUrl` = `/<slug>/settings`, the `setting.enable*`
   flags you want, and `handlerUrl` = your live-count backend if the slide has one (else `""`).
   URLs/folder/`type` stay the bare slug; only `pinKey` carries the `developer-` prefix.
5. **Design** per the `aha-design-*` skills; keep the surfaces theme-driven (readable on light
   AND dark decks) — take colour from the deck theme, never a fixed ink on the canvas.
6. **Verify — always run the dev server after CREATING or UPDATING a slide type; a build
   is not a test.** `npm run type-check && npm run build` only proves it compiles. You MUST
   then `npm run dev` (`VITE_AHA_DEFAULT_SLIDE=<slug>` picks the dev landing type) and open
   the surface(s) you touched in the browser — `https://localhost:5173/<slug>/{canvas,settings,audience}`
   — before calling the change done or handing it back. Open two tabs (Canvas + Audience) to
   watch the live flow. For a Settings change also run `npm run lint:settings`. "It renders /
   type-checks" is not "it works" — every create/update lands in a running dev server first.
7. **JUDGE — the surface is not done until this passes.** A rendering surface is a draft.
   Run each one through its judge (`aha-design-canvas-judge` / `aha-design-settings-judge`
   / `aha-design-audience-judge`), fix **every** FAIL, and re-judge until the verdict reads
   `OK TO SHIP`. Judge against the marketplace's **`origin/main`**, not the local plugin
   copy — that cache has been observed hundreds of commits behind, so judging from it
   checks stale rules. Read the criteria in full (`C1…C14`, `SETTINGS-01…-48`) rather than
   grepping for the rule you already suspect, and prove each PASS by **measuring** in the
   browser (`getBoundingClientRect` / `getComputedStyle`) — "looks right" is not evidence,
   and the judges put the burden of proof on PASS. See README → *"Building the UI is not
   the last step — judging it is"*.

## Reuse host capabilities before building new

Slide types are iframes in the host, which already exposes data + functions via the SDK
hooks. **Before adding any new state, toast, modal, image upload, title/timer, persistence,
confirm dialog or tracking, reuse the host capability** — build new only when the prompt
explicitly asks.

- **Presenter** (`usePresenterPlugin({ autoHeight? })`): `slideProps`, `presentationProps`,
  `baseUrl`, `accessToken`, `getSlideAttributesAction`, `upsertSlideAttributeAction`,
  `openUploadImageModal` / `openEditImageModal`, `subscribeTopic` / `getValues`,
  `setSubmissionCount`, `showToast*`, `showConfirmModal`, `trackGA4AndMixpanel`, …
- **Audience** (`useAudiencePlugin({ autoHeight? })`): `slideAttributesProps`, `audienceId` /
  `audienceName`, `baseUrl`, `joinGame`, `emitTyping`, `uploadImage`, `showToast*`,
  `onSubmitButtonHeightChange`, `subscribeTopic`, …
- **Cross-surface sync (same browser):** `useSync(name, initial)` / `useSyncReadOnly(...)`.
- **Submissions:** `ApiClient.sendLiveSubmission(slideType, payload)` (+ `saveSubmission`
  from `@aha/db` for a local cache). `SlideType` enum + `SubmissionType`/`SubmissionSenderType`
  from `@aha/common`.
- The **preload gate** (`App.vue` + `usePreloadActive`) must stay: don't render/consume data
  until the host flips `xprops.active` to true.

## Settings component library

Build the **Settings** surface from the composed controls in **`@/iframe/settings`**
(copied from slide-type-creator) rather than hand-rolling inputs — this is what the
`aha-design-settings` skill's patterns map to. The **live gallery of these controls**
(every one in its real states + correct usage) is the canonical reference — open it before
creating or updating any settings control and build against what it shows:
**https://staging-slides-marketplace.ahaslides.io/settings-lab**.

- Layout: `SectionHeader`, `SettingRow`, `SubSettingGroup`
- Controls: `OptionRow`, `CardSelect`, `ModeField`, `CountedInput`, `CountedTextarea`,
  `NumberWithUnit`, `NumberedItem`, `QuestionList`, `DropdownMenu`
- Helpers: `HelpTooltip` (the `?` help glyph, never `ⓘ`), `InfoBox`, `ImageDropzone`,
  `ImageActionButton`

```ts
import { SettingRow, SectionHeader, OptionRow, CountedTextarea } from '@/iframe/settings'
```

They are compositions over themed Ant primitives — a plain `<a-input>` / `<a-switch>` /
`<a-select>` already carries the AhaSlides look, so use those directly and reach for a
library component only for the composed layout or a shape Ant lacks. Class-string / spacing
tokens live in **`@/iframe/uiStandard`** (backed by `src/iframe/ui-standard.json`) — import
them instead of retyping utility strings.

## manifest.json schema (per slide type)

`public/manifest.json` is an array of these. `<type>` = the folder slug; URLs are paths the
host prefixes with this deploy's domain.

```
{
  "name", "pinKey", "desc", "tags": [...],
  "ahaConfig": {
    "name", "type", "category", "icon", "isNew", "beta", "iconInside", "desc", "tags": [...],
    "preview", "previewUrl", "previewUrlFr", "previewUrlVisual", "visualType", "videoTutorialUrl",
    "plugin": true, "defaultSlideTitle", "pinKey",
    "canvasUrl": "/<type>/canvas", "audienceUrl": "/<type>/audience", "editorUrl": "/<type>/settings",
    "handlerUrl": "https://…",              // live-count backend, or "" if none
    "setting": { "enableQuestionTitle": …, "enableTimeLimit": …, "enableFullScreen": …, … },
    "defaultVisible": true, "source": "presenterDeveloper"
  },
  "visible": true
}
```

`pinKey` (top-level and `ahaConfig.pinKey`, kept equal) is always prefixed **`developer-`**
(e.g. `developer-horse-race`) so a presenter-created type never collides with a built-in one;
`type`, the URLs and the folder use the bare slug.

You may only change VALUES of these keys — never add, remove or rename a key (the host reads a
fixed shape). Turn a host feature on/off via its `setting.enable*` flag.

## Commands

```bash
npm install         # token-free (public deps + @aha/* Release tarballs)
npm run setup:https # ONE-TIME per machine: mkcert trusted cert — REQUIRED before host testing
npm run dev         # HTTPS vite dev server (auto-uses certs/ if present, else self-signed)
npm run type-check  # vue-tsc --noEmit
npm run build       # type-check + vite build
```

**Fresh-clone HTTPS/CORS failure:** the host fetches `https://localhost:5173/manifest.json`
cross-origin; a browser silently rejects that background fetch for an untrusted cert, so it
surfaces as an HTTPS/CORS error. Fix = `npm run setup:https` (mkcert) + restart `npm run dev`,
never a CORS/vite change — the server already reflects the origin. See
`.claude/skills/slide-type-data-and-runtime` §6.

Update the SDK: the tarball URLs point at `aha-slide-plugin`'s moving `sdk-latest` release
(refreshed on every push to its default branch) — re-run `npm install` to pull the newest;
or pin a `sdk-v<date>` tag URL for a reproducible build.
