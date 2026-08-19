---
name: slide-type-data-and-runtime
description: >-
  MANDATORY before wiring DATA or LIVE behaviour on any slide type in this repo
  (aha-slide-types-public) — reading/writing submissions, live vote/answer counts
  on the Canvas, the audience submit flow, cross-surface sync, or running/testing
  the plugin against a real HTTPS host. Encodes the SDK plugin contract (which
  fields are Refs vs plain) and the exact pitfalls that produced silent zero-count
  charts, so a new slide type doesn't repeat them. The per-surface design rules
  (.claude/rules/slide-types/*) cover how a surface LOOKS; this covers how it
  DATA-FLOWS and RUNS.
---

# Slide-type data & runtime — the contract, and the traps

Load this the moment a slide type needs live data (counts, votes, submissions),
a submit flow, or you're about to test it inside the real host. Every rule below
is here because breaking it produced a shipped bug that looked like "nothing
happens" with no error on screen.

## 1. The plugin field contract — Ref vs plain (this bites hardest)

`usePresenterPlugin()` / `useAudiencePlugin()` return a MIX of Vue `Ref`s and
plain values. Reading `.value` off a plain string (or forgetting it on a Ref)
fails **silently**:

| Field | Shape | Read as |
|---|---|---|
| `slideProps`, `presentationProps` | `Ref` | `plugin.slideProps.value` |
| `baseUrl` | `Ref<string \| undefined>` | `plugin.baseUrl.value` |
| **`accessToken`** | **plain `string`** (`xprops.token`) | **`plugin.accessToken`** — NO `.value` |
| `audienceId`, `slideAttributesProps` | `Ref` | `.value` |

**The canonical bug:** `new ApiClient(baseUrl, plugin.accessToken?.value)` → the
token is `undefined` → the request goes out unauthenticated → **401** → caught →
the chart sits at 0 while the host's own response-count badge climbs. It's
`plugin.accessToken` (plain). When in doubt, `console.log(plugin.<field>)` and
check for a ref wrapper before choosing `.value`.

## 2. Live counts on the Canvas — two paths, pick by whether you have a handler

The audience writes a vote with `ApiClient.sendLiveSubmission(SlideType.X, { …,
attributes: { … } })`. The Canvas reads them back in ONE of two ways:

- **No handler (default, simplest):** poll `ApiClient.getSubmissions({ slideId })`
  on an interval and tally client-side from `submission.attributes`. **Verified on
  staging** (`audience.dev.ahaslide.com`): `POST /api/live/submissions` (→ 202)
  lands in the queryable `GET /api/submissions` store with `attributes.optionIds`
  intact, so this path works cross-device with NO handler. Rules, each verified:
    - **Query by `slideId` ONLY — do NOT pass `slideVersion`.** A mismatch returns
      an empty list (measured: `slideVersion=2` for a v1 submission → `0` items),
      and a slide edit bumps the version, so filtering silently zeros the chart.
    - The `type` param does not strictly filter (both `response` and the slide-type
      string returned the row), so omit it — it can't help and might mislead.
    - **Dedupe by `senderId`** so a re-vote replaces, not double-counts; then tally
      `attributes.optionIds`. Parse the attribute shape tolerantly.
    - Downside: ~poll-interval latency (a couple of seconds), not instant.
- **With a handler (realtime):** a `handler.ts` (Cloudflare Worker, `handlerUrl`
  in the manifest) maps each submission to `count_total`/per-key events on a
  `getBucket(...)` topic; the Canvas uses `subscribeTopic({ type: 'counting',
  topic, callback })` + `getValues({ bucket })`. Only this path is instant. The
  backend auto-emits TOTAL only — per-option counts always need a handler.

**`baseUrl` may be absent on the presenter plugin** in some host loads → keep a
fallback API base (default STAGING, overridable via `VITE_AHA_API_BASE`), and use
`plugin.baseUrl?.value || API_BASE`. `setSubmissionCount` / `enableVoteCount` are
deprecated no-ops — don't rely on them.

## 3. Optimistic writes + cross-surface sync

- **Bump the local (`useSync`) tally BEFORE the server `await`, not after.** In
  standalone dev there is no host, so `sendLiveSubmission` throws — any state
  update placed after the await never runs (the "vote didn't register" symptom).
  Snapshot, apply optimistically, then roll back BOTH the lock and the tally if
  the server call rejects. Give a local IndexedDB mirror (`saveSubmission`) its
  OWN catch so its failure can't un-count a server-accepted vote.
- **Stable default ids.** With no persisted config (e.g. the dev preview), each
  surface builds its own default config; random `nanoid()` ids diverge, so the
  Canvas tallies keys the Audience never voted on (total climbs, every option
  stays 0). Give the DEFAULT options fixed ids (`opt-1`, `opt-2`, …); only
  user-added options get a fresh nanoid. In the real host the persisted config
  makes all surfaces agree anyway.
- `useSync` is BroadcastChannel — same-browser only. It is a dev/local convenience
  and instant-feedback layer, never the cross-device source of truth (that's the
  backend, §2).

## 4. Config vs data model

`ahaConfig` + the `setting.enable*` host opt-ins live in **`public/manifest.json`**
(see the `manifest` rule). The question title/description/image are host controls
(`enableQuestion*` → `slideProps.title/description/image`), NOT config fields. The
per-type `config.ts` is only the slide's own data model (options/layout + defaults
+ a `migrate()` that back-fills every field). Turning a host feature on = a
manifest edit; a slide-specific field = a `config.ts` + control edit.

## 5. Standalone dev vs the real host — they differ

The dev preview (`npm run dev`, opened directly) has **no host**: `baseUrl`/
`accessToken` are empty, `sendLiveSubmission` throws, there is no persisted config,
and `slideProps` carries only what the local broker provides (palette/font but
often not `textColour`). Code so both work: guard host calls, fall back locally,
and never assume a value the host injects is present. Real theme/auth/counting
behaviour is only observable inside the host.

## 6. Running & testing against a real HTTPS host

The plugin is loaded as an **iframe by an HTTPS host** (presenter/audience), so:

- **Dev server must be HTTPS.** `npm run dev` defaults to HTTPS (`@vitejs/plugin-basic-ssl`)
  on `https://localhost:5173`. Opt out with `npm run dev:http`.
- **CORS.** `server.cors` reflects the requesting origin so the host can
  `fetch(<link>/manifest.json)` cross-origin. Without it the manifest fetch is
  blocked.
- **Trust the cert.** A cross-origin background fetch can't click through a cert
  warning. Open `https://localhost:5173` once and accept the self-signed cert
  (Chrome: type `thisisunsafe`), or use a `mkcert` locally-trusted cert for zero
  warnings, or a `--disable-web-security` Chrome for a throwaway session.
- In the presenter **Developer** page, set the manifest link (per env tab) to
  `https://localhost:5173`; the env resolves by build DOMAIN, so a `develop`/
  staging host reads the **Staging** tab.

## Pre-ship checklist

- [ ] `plugin.accessToken` read as a plain string; `baseUrl`/`slideProps` via `.value`.
- [ ] Canvas gets live counts (getSubmissions poll or handler+subscribeTopic), NOT
      filtered by slideVersion, deduped by sender, with an API_BASE fallback.
- [ ] Optimistic tally bumped before the await + rolled back on reject; stable
      default option ids.
- [ ] Host title/desc/image via manifest flags; config.ts holds only the data model.
- [ ] Verified inside the real host over HTTPS (cert trusted, CORS ok), not just dev.
