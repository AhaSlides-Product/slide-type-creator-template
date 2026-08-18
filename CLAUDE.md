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
- **Design skills.** `.claude/settings.json` enables the public `aha-design` plugin;
  use `aha-design-canvas` / `aha-design-audience` / `aha-design-settings` when building UI.

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
6. **Verify**: `npm run type-check && npm run build`; `npm run dev` to preview
   (`VITE_AHA_DEFAULT_SLIDE=<slug>` picks the dev landing type).

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
`aha-design-settings` skill's patterns map to:

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
npm run dev         # vite dev server
npm run type-check  # vue-tsc --noEmit
npm run build       # type-check + vite build
```

Update the SDK: the tarball URLs point at `aha-slide-plugin`'s moving `sdk-latest` release
(refreshed on every push to its default branch) — re-run `npm install` to pull the newest;
or pin a `sdk-v<date>` tag URL for a reproducible build.
