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
npm run dev         # HTTPS dev server on https://localhost:5173
```

`npm run dev` serves **HTTPS by default** (self-signed via `@vitejs/plugin-basic-ssl`)
because the host loads the plugin in an HTTPS iframe — an `http://localhost` iframe is
mixed-content-blocked. Use `npm run dev:http` to force plain HTTP.

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

1. **Run the HTTPS dev server**

   ```bash
   npm run dev            # https://localhost:5173
   ```

2. **Trust the self-signed cert once.** Open <https://localhost:5173> directly in the
   browser you'll test with and accept the warning (Chrome: click the page and type
   `thisisunsafe`). A cross-origin background fetch can't click through a cert prompt,
   so this step is required — or generate a trusted cert with
   [`mkcert`](https://github.com/FiloSottile/mkcert), or launch a throwaway
   `--disable-web-security` Chrome.

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
npm run dev          # HTTPS dev server (https://localhost:5173)
npm run dev:http     # plain HTTP dev server
npm run type-check   # vue-tsc --noEmit
npm run build        # type-check + vite build
```

## Design skills (aha-design)

`.claude/settings.json` enables the **`aha-design`** plugin from the public
`AhaSlides-Product/aha-design-public` marketplace, so design-system skills (antd,
settings UX, canvas/iframe, audience, typography) load for agents in this repo.

## Public-repo guardrails

- No secrets committed; installing needs no token by design.
- The shipped bundle exposes frontend code (normal) → every `/api/*` endpoint must
  enforce auth server-side.
