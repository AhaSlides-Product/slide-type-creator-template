# aha-slide-types-public

A PUBLIC **slide-plugin frontend skeleton** for AhaSlides. It has the three host
surfaces a slide plugin runs in — **Canvas / Settings / Audience** — as three
routes, plus the `aha-design` skills plugin pre-wired. Modeled on the canonical
`aha-slide-plugin/apps/sample-slide` template.

> **Token-free by design.** This repo installs with **only public packages** —
> no `.npmrc`, no `GH_TOKEN`. The private `@aha/*` SDK (`@ahaslides-product/plugins-*`,
> on GitHub Packages) is **intentionally not a dependency here**, because it can't be
> installed without registry access. Wire it in later when you have that access
> (see "Adding the SDK" below).

## Setup

```bash
npm install        # public deps only — no token needed
cp .env.example .env
npm run dev
```

## Structure

```
src/
  main.ts                  # Vue + Ant Design Vue + router (no SDK imports)
  App.vue                  # <router-view>
  router/index.ts          # /:type/{canvas,settings,audience}/:slideId
  pages/Canvas|Settings|Audience.vue
  composables/useXProps.ts # raw reactive window.xprops from the host (SDK-free)
vite.config.ts             # vue + tailwind v4 + /api dev proxy
```

The three routes match how the AhaSlides host mounts a plugin in iframes
(`/:type/canvas/:slideId`, `/:type/settings/:slideId`, `/:type/audience/:slideId`).

## Design skills (aha-design)

`.claude/settings.json` enables the **`aha-design`** plugin from the public
`AhaSlides-Product/aha-design-public` marketplace, so agents working in this repo
get the design-system skills (antd, settings UX, canvas/iframe, audience,
typography, tables, overlays, paywall, feedback, status badges) automatically.

## Adding the SDK later (`@aha/*`)

To make this a real, host-integrated plugin you need the private SDK. Two paths:

1. **With registry access** — restore `.npmrc` (`@ahaslides-product:registry` +
   `GH_TOKEN`), add the deps back
   (`@ahaslides-product/plugins-{ui,api,common,db}`), re-add the `@aha/*` aliases
   in `vite.config.ts` / `tsconfig.json`, and re-import the zoid bridge + hooks in
   `main.ts` / pages (copy from `aha-slide-plugin/apps/sample-slide/frontend`).
2. **Inside the monorepo** — develop as a workspace app under
   `aha-slide-plugin/apps/*` (deps `@aha/*: "*"`), which resolves the SDK locally
   with no token.

## Public-repo guardrails

- Never commit secrets. There is no token in this repo by design.
- If you add the SDK back with a token, keep `GH_TOKEN` in env / CI secrets only —
  never commit it.
- The shipped bundle exposes frontend code (normal) → every `/api/*` endpoint must
  enforce auth server-side.
