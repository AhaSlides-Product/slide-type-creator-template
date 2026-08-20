---
name: slide-type-data-and-runtime
description: >-
  MANDATORY before wiring DATA or LIVE behaviour on any slide type in this repo
  (aha-slide-types-public) — reading/writing submissions, live vote/answer counts
  on the Canvas, the audience submit flow, cross-surface sync, or running/testing
  the plugin against a real HTTPS host — including the MANDATORY trusted-cert
  (mkcert) local-HTTPS setup a fresh clone needs or the host's cross-origin
  manifest fetch fails as a "CORS"/HTTPS error. Encodes the SDK plugin contract
  (which fields are Refs vs plain) and the exact pitfalls that produced silent
  zero-count charts, so a new slide type doesn't repeat them. The per-surface design rules
  (.claude/rules/slide-types/*) cover how a surface LOOKS; this covers how it
  DATA-FLOWS and RUNS.
---

# Slide-type data & runtime — the contract, and the traps

Load this the moment a slide type needs live data (counts, votes, submissions),
a submit flow, or you're about to test it inside the real host. Every rule below
is here because breaking it produced a shipped bug that looked like "nothing
happens" with no error on screen.

## 0. Data identity — key every value by the right slice of `(presentationId, slideId, slideVersion)`

**Getting the key wrong is how "Reset result" wipes the author's setup, or how an
edit fails to clear stale votes.** Every value a slide type stores belongs to exactly
one of three classes, each keyed differently — decide the class first, then the key:

| Data | Key by | Survives "Reset result" / edit? | How |
|---|---|---|---|
| **Persistent config / settings** (options, toggles, layout) | **`slideId`** only | **YES — must survive** | `upsertSlideAttributeAction({ slideId, attributeKey })` + `useSync(\`<KEY>/s${slideId}\`)` |
| **Live counts / submissions** (votes, answers, tallies) | **`(presentationId, slideId, slideVersion)`** | **NO — must reset** | `getSubmissions({ slideId, slideVersion })` (poll) or `getBucket({ presentationId, slideId, slideVersion })` + `subscribeTopic` (handler) |
| **Same-browser sync** (`useSync` channels) | channel string; version-scope the LIVE ones, slideId-only for config | n/a (BroadcastChannel, same browser) | `<slug>-votes/s${slideId}-v${slideVersion}` for tallies; `<KEY>/s${slideId}` for config |

- **"Reset result" == a `slideVersion` bump.** The host does NOT delete rows; it
  advances `slide.version`, and version-scoped data is simply queried at the new
  version, so it reads empty. That is the ONLY reset mechanism — so live data MUST be
  version-scoped or reset does nothing, and config MUST NOT be version-scoped or the
  author's options vanish on every reset/edit. A content edit bumps the version too,
  which is why editing a live slide correctly restarts its count.
- **Read `slideVersion` reactively**, never cache it at mount — a stale version
  returns an empty list (looks like "the data disappeared"), and on re-present the
  `slide` prop can arrive stale then settle, so a `computed(() => slideProps.value?.version)`
  re-queried each poll self-heals; an `onMounted`-only read does not.
- **A reset that is NOT a version bump** (an app-level round/`roundId` in `useSync`, a
  local `clear()` button) is on you: `getSubmissions` can't scope by it, so clear the
  local tally yourself and don't backfill stale-round rows.
- `presentationId` scopes live data to this presentation (duplicated decks don't
  cross-count); `slideId` is the stable per-slide identity; `slideVersion` is the
  reset/edit axis. Config needs only `slideId` because it is meant to outlive every
  version.

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

- **No handler (default, simplest):** poll
  `ApiClient.getSubmissions({ slideId, slideVersion })` on an interval and tally
  client-side from `submission.attributes`. **Verified on staging**
  (`audience.dev.ahaslide.com`): `POST /api/live/submissions` (→ 202) lands in the
  queryable `GET /api/submissions` store with `attributes.optionIds` intact, so this
  path works cross-device with NO handler. Rules, each verified:
    - **Scope the query by the CURRENT `slideVersion` (read reactively) — this is
      how "Reset result" clears the chart.** The host bumps `slide.version` on a
      reset AND on a content edit; querying the current version returns only
      post-reset votes, so the tally starts clean — the intended behaviour. The
      empty-list measurement (`slideVersion=2` for a v1 submission → `0` items) is a
      trap ONLY when you pass a **stale/cached** version — never a reason to drop the
      filter. Read `slideProps.value?.version` inside the poll (or a `computed`) so
      it self-heals after the version settles; omit the filter only when it's
      `0`/undefined (dev/no host). See §0 for the full keying convention.
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
manifest edit; a slide-specific field = a `config.ts` + control edit. This config is
**slideId-keyed and must survive a reset/edit** — never fold `slideVersion` into its
key (§0), or "Reset result" erases the author's options.

## 5. Standalone dev vs the real host — they differ

The dev preview (`npm run dev`, opened directly) has **no host**: `baseUrl`/
`accessToken` are empty, `sendLiveSubmission` throws, there is no persisted config,
and `slideProps` carries only what the local broker provides (palette/font but
often not `textColour`). Code so both work: guard host calls, fall back locally,
and never assume a value the host injects is present. Real theme/auth/counting
behaviour is only observable inside the host.

## 6. Running & testing against a real HTTPS host — HTTPS with a TRUSTED cert is REQUIRED

The plugin is loaded as an **iframe by an HTTPS host** (presenter/audience), and the
host does a **cross-origin background `fetch(https://localhost:5173/manifest.json)`**.
A background fetch **cannot click through a cert warning** — so with an UNtrusted cert
the browser silently rejects it and the failure reaches a new dev as a **"CORS" /
network error with nothing to click**. This is the #1 fresh-clone onboarding failure:
"I pulled the repo, ran `npm run dev`, and the presenter can't load my slide —
HTTPS/CORS error." The dev server already sends the right CORS headers (`server.cors`);
the missing piece is a **locally-trusted cert**, not CORS config.

**MANDATORY setup — do this once per machine before testing in the host, and require it
of anyone onboarding:**

```bash
npm run setup:https   # mkcert: installs a local CA + writes certs/localhost*.pem
npm run dev           # vite auto-detects certs/ and serves a TRUSTED https://localhost:5173
```

`npm run setup:https` needs [`mkcert`](https://github.com/FiloSottile/mkcert) on PATH
(`brew install mkcert nss` / `choco install mkcert` / `apt install mkcert`). `vite.config.ts`
uses `certs/localhost.pem` + `certs/localhost-key.pem` when present (git-ignored, per
machine); with a trusted cert the host's manifest fetch just works — no `thisisunsafe`,
no `--disable-web-security`.

- **Fallback only, NOT for host testing:** without a trusted cert `npm run dev` still
  serves HTTPS via `@vitejs/plugin-basic-ssl` (self-signed). That is fine for opening
  `https://localhost:5173` **directly** (accept the warning once), but it is exactly the
  cert the host's cross-origin fetch rejects — so it does **not** unblock the presenter.
  Treat mkcert as the standard; basic-ssl is a quick-look degrade.
- **Never `npm run dev:http`** when testing in the host — an `http://localhost` iframe
  inside an HTTPS host is mixed-content-blocked before CORS even matters.
- In the presenter **Developer** page, set the manifest link (per env tab) to
  `https://localhost:5173`; the env resolves by build DOMAIN, so a `develop`/staging host
  reads the **Staging** tab.

If a fresh clone reports HTTPS/CORS on `manifest.json`, the fix is **`npm run setup:https`
+ restart `npm run dev`**, not a CORS/vite change — the server already reflects the origin.

## Pre-ship checklist

- [ ] `plugin.accessToken` read as a plain string; `baseUrl`/`slideProps` via `.value`.
- [ ] Data keyed by class (§0): config by `slideId` (survives reset/edit); live
      counts/submissions by `(presentationId, slideId, slideVersion)` with the CURRENT
      version read reactively (so "Reset result" clears them); `useSync` live channels
      version-scoped. Counts deduped by sender, with an API_BASE fallback.
- [ ] Verified: "Reset result" clears the tally but keeps the options; editing an
      option keeps the other options (config survived the version bump).
- [ ] Optimistic tally bumped before the await + rolled back on reject; stable
      default option ids.
- [ ] Host title/desc/image via manifest flags; config.ts holds only the data model.
- [ ] `npm run setup:https` run (mkcert trusted cert) — verified inside the real host
      over HTTPS, not just the standalone dev preview. A basic-ssl self-signed cert does
      NOT unblock the host's cross-origin manifest fetch.
