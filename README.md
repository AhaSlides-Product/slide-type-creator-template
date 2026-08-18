# aha-slide-types-public

A PUBLIC **slide-plugin frontend** for AhaSlides. It runs inside the AhaSlides host
as three iframe surfaces — **Canvas / Settings / Audience** — using the shared
`@aha/*` SDK, and has the public `aha-design` skills plugin pre-wired. Modeled on the
canonical `aha-slide-plugin/apps/sample-slide` template.

> **Token-free install.** No `.npmrc`, no `GH_TOKEN`, no npmjs. The `@aha/*` SDK is
> pulled from **public GitHub Release tarballs** of `aha-slide-plugin` (asset URLs in
> `package.json`), which download with no auth. Everything else is public npm.

## Setup

```bash
npm install        # public deps + @aha/* tarballs — no token needed
cp .env.example .env
npm run dev
```

## Structure

```
src/
  main.ts                  # Vue + Antd + @aha/ui CSS + zoid bridge + emitAction
  App.vue                  # a-config-provider(theme) + preload gate
  router/index.ts          # /:type/{canvas,settings,audience}/:slideId
  pages/Canvas|Settings|Audience.vue   # real surfaces via usePresenterPlugin / useAudiencePlugin
  composables/usePreload.ts, useSlideImage.ts, useXProps.ts
vite.config.ts             # vue + tailwind v4 + @aha/ui icon plugin + /api dev proxy
```

The three routes match how the host mounts the plugin in iframes. A setting is a
`useSync` ref (instant across surfaces) persisted with `upsertSlideAttributeAction`;
audience responses go through `ApiClient.sendLiveSubmission`.

## The @aha/* SDK (token-free, via GitHub Releases)

`package.json` depends on the SDK by tarball URL, e.g.:

```
"@aha/ui": "https://github.com/AhaSlides-Product/aha-slide-plugin/releases/download/sdk-latest/aha-ui.tgz"
```

All six are listed (`common, api, db, ui` + transitive `design, ui-vanilla`) so npm
satisfies each tarball's internal `"@aha/*": "*"` deps by dedup. `unplugin-icons` is a
devDep required by the `@aha/ui` vite icon plugin.

**Updating the SDK:** the tarballs are produced by the `release-sdk-tarballs` workflow
in `aha-slide-plugin` (runs on every push to its default branch).
- **Always-latest:** the URLs above point at the moving `sdk-latest` release — re-run
  `npm install` (bump the lockfile) to pull the newest build.
- **Pinned/reproducible:** point at a versioned tag/asset instead, e.g.
  `.../download/sdk-v2026.08.18/aha-ui-1.6.0.tgz`, and bump when you want the update.

## Design skills (aha-design)

`.claude/settings.json` enables the **`aha-design`** plugin from the public
`AhaSlides-Product/aha-design-public` marketplace, so design-system skills (antd,
settings UX, canvas/iframe, audience, typography, …) load for agents in this repo.

## Public-repo guardrails

- No secrets are committed; installing needs no token by design.
- The shipped bundle exposes frontend code (normal) → every `/api/*` endpoint must
  enforce auth server-side.
