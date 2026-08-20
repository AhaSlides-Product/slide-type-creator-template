# aha-slide-types-public

A PUBLIC **slide-plugin frontend** for AhaSlides. Each slide type runs inside the
AhaSlides host as three iframe surfaces — **Canvas** (presenter stage), **Settings**
(editor panel), **Audience** (participant device) — using the shared `@aha/*` SDK,
with the public `aha-design` skills plugin pre-wired.

> **Token-free install.** No `.npmrc`, no `GH_TOKEN`, no npmjs auth. The `@aha/*`
> SDK is pulled from **public GitHub Release tarballs** of `aha-slide-plugin` (asset
> URLs in `package.json`). Everything else is public npm.

## Quick start

```bash
npm install         # public deps + @aha/* tarballs — no token needed
npm run setup:https # ONE-TIME per machine: mkcert trusted cert (certs/localhost*.pem)
npm run dev         # HTTPS dev server on https://localhost:5173
```

`npm run dev` serves **HTTPS by default** because the host loads the plugin in an HTTPS
iframe — an `http://localhost` iframe is mixed-content-blocked. **To test inside the real
presenter/audience host you MUST run `npm run setup:https` first:** the host fetches
`https://localhost:5173/manifest.json` cross-origin, and a browser silently rejects that
background fetch for an UNtrusted cert — surfacing as an "HTTPS/CORS" error you can't click
through (the usual fresh-clone failure). `setup:https` uses
[`mkcert`](https://github.com/FiloSottile/mkcert) (`brew install mkcert nss`) to write a
locally-trusted cert into `certs/` (git-ignored); vite auto-detects it. Without it, `npm run
dev` falls back to a self-signed cert — fine for opening `https://localhost:5173` directly,
but it will NOT unblock the host. `npm run dev:http` forces plain HTTP (host testing off).

## Structure

```
src/
  main.ts                       # Vue + Antd + @aha/ui CSS + zoid bridge
  App.vue                       # config-provider(theme) + preload gate
  SurfaceHost.vue               # resolves the surface by the route :type param
  router/index.ts               # /:type/{canvas,settings,audience}
  slide-types/<type>/
    config.ts                   # the slide's DATA MODEL (options/layout + defaults + migrate)
    Canvas.vue Settings.vue Audience.vue
  iframe/settings/*             # composed settings controls (OptionRow, CardSelect, …)
  iframe/uiStandard.ts          # spacing / class-string tokens
public/manifest.json            # the slide-type catalogue this deploy offers (see below)
```

**One folder per slide type.** `SurfaceHost.vue` + the router resolve the surface by
the `:type` param, so `src/slide-types/<slug>/` is a new slide type with no router
edit. `test-poll/` is the reference.

- A setting is a `useSync` ref (instant across surfaces) persisted with
  `upsertSlideAttributeAction`; audience responses go through
  `ApiClient.sendLiveSubmission`; the canvas reads live counts by polling
  `ApiClient.getSubmissions` (or a counting handler for realtime).
- **Config lives in `public/manifest.json`** — `ahaConfig` + the `setting.enable*`
  host opt-ins — NOT in code. The question title/description/image are host controls.
- **Read the agent rules** in `.claude/rules/slide-types/*` (per surface) and the
  `.claude/skills/slide-type-data-and-runtime` skill (SDK contract + live-data
  pitfalls) before building or debugging a slide type.

## Testing against the real presenter (staging)

The plugin only fully works inside the host (theme, auth, live counts). To test your
local build against staging:

1. **Generate a trusted cert, then run the HTTPS dev server**

   ```bash
   npm run setup:https    # once per machine — mkcert local CA + certs/localhost*.pem
   npm run dev            # https://localhost:5173 (vite auto-uses the trusted cert)
   ```

2. **Why the trusted cert is required.** The presenter does a cross-origin background
   `fetch(https://localhost:5173/manifest.json)`, and a background fetch **cannot click
   through a cert warning** — so a self-signed cert is silently rejected and shows up as
   an HTTPS/CORS failure. `npm run setup:https` (mkcert) makes the cert locally-trusted,
   so the fetch just works — no `thisisunsafe`, no `--disable-web-security`. (Missing
   `mkcert`? `brew install mkcert nss`, then re-run.) The basic-ssl self-signed fallback
   is only for opening `https://localhost:5173` directly, not for host testing.

3. **Register the manifest link in the presenter.** Open the presenter
   (<https://presenter.dev.ahaslide.com>), go to **Profile → Developer**, and in the
   **Staging** tab set the manifest URL to:

   ```
   https://localhost:5173
   ```

   Save. (Env resolves by the build domain — a `dev`/staging host reads the *Staging*
   tab. The presenter fetches `https://localhost:5173/manifest.json`, so CORS + the
   trusted cert from step 2 must both be in place — the dev server already sends CORS
   headers.)

4. **Use it.** On <https://presenter.dev.ahaslide.com>, add a new slide — your slide
   type(s) from `manifest.json` appear in the picker (behind the
   `AHA-47349-presenter-can-create-new-slide-type` flag). Edit it in the Settings
   panel, present it, and join as a participant to test the Audience + live results.

> Requires the `AHA-47349-presenter-can-create-new-slide-type` and
> `AHA-42884-new-slide-market-place` flags enabled for your test account.

## The @aha/* SDK (token-free, via GitHub Releases)

`package.json` depends on the SDK by tarball URL, e.g.:

```
"@aha/ui": "https://github.com/AhaSlides-Product/aha-slide-plugin/releases/download/sdk-latest/aha-ui.tgz"
```

All packages (`common, api, db, ui` + transitive `design, ui-vanilla`) are listed so
npm satisfies each tarball's internal `"@aha/*": "*"` deps by dedup.

**Updating the SDK:** the tarballs are produced by the `release-sdk-tarballs` workflow
in `aha-slide-plugin` (every push to its default branch).
- **Always-latest:** the URLs point at the moving `sdk-latest` release — re-run
  `npm install` to pull the newest build.
- **Pinned:** point at a versioned tag asset (`.../download/sdk-v2026.08.18/…`) and
  bump when you want the update.

## Commands

```bash
npm run setup:https  # one-time: mkcert trusted cert (certs/localhost*.pem) — REQUIRED for host testing
npm run dev          # HTTPS dev server (https://localhost:5173)
npm run dev:http     # plain HTTP dev server (host testing off)
npm run type-check   # vue-tsc --noEmit
npm run build        # type-check + vite build
```

## Design skills (aha-design)

`.claude/settings.json` enables the **`aha-design`** plugin from the public
`AhaSlides-Product/aha-design-public` marketplace, so design-system skills (antd,
settings UX, canvas/iframe, audience, typography) load for agents in this repo.

### Building the UI is not the last step — judging it is

A surface is **not done when it renders**. Every surface you build or restyle must then
be run through its **judge** skill, every FAIL fixed, and the judge re-run until it
reads `OK TO SHIP`:

| Surface | Build with | Then judge with |
| --- | --- | --- |
| `Canvas.vue` | `aha-design-canvas` | **`aha-design-canvas-judge`** |
| `Settings.vue` | `aha-design-settings` | **`aha-design-settings-judge`** |
| `Audience.vue` | `aha-design-audience` | **`aha-design-audience-judge`** |

The judges emit a binary PASS/FAIL per criterion with a `Where / Evidence / Fix` block —
they exist because reading the build skill and *believing* you complied is not the same
as checking. Skipping the judge is how a panel ships with a content-width "+ Add", a
composite item that lost its grey card, or option labels at the wrong type scale: each
one is a named FAIL in a judge that was never run.

**Judge against `origin/main` of the marketplace, not the local plugin copy.** The
plugin cache under `~/.claude/plugins/marketplaces/aha-claude-plugins` goes stale — it
has been observed **hundreds of commits behind**, so a judge run from it silently checks
last month's rules. Refresh it (`/plugin` in Claude Code) or read the current skill
straight from git before judging:

```bash
cd ~/.claude/plugins/marketplaces/aha-claude-plugins && git fetch origin
git log --oneline HEAD..origin/main -- plugins/aha-design   # what you'd be missing
git show origin/main:plugins/aha-design/skills/aha-design-settings-judge/SKILL.md
```

Two habits the judges assume, both learned the hard way:

- **Read the criteria, don't grep them.** Walking `C1…C14` / `SETTINGS-01…-48` finds the
  failures; grepping for the word you already have in mind finds only that one.
- **Verify by measuring, not by eye.** "Looks centred" is not evidence. Measure it in
  the browser (`getBoundingClientRect`, `getComputedStyle`) and quote the number — the
  judges' burden of proof is on PASS, so an unverifiable criterion is a FAIL.

## Public-repo guardrails

- No secrets committed; installing needs no token by design.
- The shipped bundle exposes frontend code (normal) → every `/api/*` endpoint must
  enforce auth server-side.
