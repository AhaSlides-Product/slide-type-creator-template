---
paths:
  - "public/manifest.json"
---

# Declaring a slide type — public/manifest.json

**This file is where a slide type's config lives** — its host registration (`ahaConfig`)
and which host features it opts into (`setting.enable*`). NOT in `Settings.vue`, NOT in the
per-type `config.ts` (that one is only the slide's own data model — its option/layout shape
and defaults, synced via `useSync`). Turning a host title/timer/lock on or off is a manifest
edit, not a code change.

`public/manifest.json` is an **array**, one entry per slide type this deploy offers (served
at `<domain>/manifest.json` and read by the host to build its slide-type catalogue). Each
entry:

```
{
  "name", "pinKey", "desc", "tags": [...],
  "ahaConfig": {
    "name", "type", "category", "icon", "isNew", "beta", "iconInside", "desc", "tags": [...],
    "preview", "previewUrl", "previewUrlFr", "previewUrlVisual", "visualType", "videoTutorialUrl",
    "plugin": true, "defaultSlideTitle", "pinKey",
    "canvasUrl": "/<type>/canvas", "audienceUrl": "/<type>/audience", "editorUrl": "/<type>/settings",
    "handlerUrl": "https://…",           // live-count backend, or "" if none
    "setting": { "enableQuestionTitle": …, "enableTimeLimit": …, "enableFullScreen": …, … },
    "defaultVisible": true, "source": "presenterDeveloper"
  },
  "visible": true
}
```

Rules:

- **`type`, the URLs and the folder use the bare slug** (`horse-race`,
  `canvasUrl: "/horse-race/canvas"`). The host prefixes the URLs with this deploy's domain,
  so they are paths, not full links.
- **`pinKey` is always prefixed `developer-`** (e.g. `developer-horse-race`) so a
  presenter-created type never collides with a built-in one. Keep the top-level `pinKey` and
  `ahaConfig.pinKey` **equal**.
- **`setting.enable*` = opt into a host-rendered control** (title, description, timer,
  lock-submission, full-screen, audience-join, …). Turn on ONLY the ones the slide uses — a
  flag on "just in case" leaves a dead control in the host editor. The close-submissions flag
  is `enableStopSubmitssionSetting` (doubled `ss` — the single-s spelling is a silent no-op).
- **Values only.** You may change the VALUE of these keys, never add / remove / rename a key
  — the host reads a fixed shape. Copy an existing entry as the template for a new one.
