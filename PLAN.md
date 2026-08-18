> **Current direction (supersedes the plan below).** This repo is now a
> **token-free public skeleton**: only public packages, no `.npmrc`, no `GH_TOKEN`.
> The private `@aha/*` SDK (`@ahaslides-product/plugins-*`) is **not** a dependency
> here — it can't be installed without registry access, so it was removed. The
> `slide-type-kit` skills plugin is also dropped; only the public `aha-design`
> plugin is enabled. See `README.md` → "Adding the SDK later" to re-integrate the
> SDK when you have access. The historical reuse plan is kept below for context.

---

# Reuse plan — 2 public artifacts, new frontend consumes both

Corrected model (matches how the org already works):

- **Reusable CODE is already packaged** by the `aha-slide-plugin` monorepo and
  published to GitHub Packages as `@ahaslides-product/plugins-*`
  (`plugins-api` = SDK, `plugins-ui` = components/theme/sync/audio/image,
  `plugins-common`, `plugins-db`, `plugins-design`, `plugins-ui-vanilla`).
  → Nothing to extract from `slide-type-creator`. This app just installs them.
- **SKILLS are NOT packaged yet** — they live in `slide-type-creator/.claude/skills`.
  → Package them as a Claude plugin so any repo (incl. this one) installs them.

`slide-type-creator/src/*` (iframe/playground/slide-types) is the multi-slide-type
playground — creator-specific, deliberately NOT reused here. This app is its own
frontend shell.

## The 2 things to make public

### 1. Code — DONE (already published)
Consume directly in `package.json`:
`@ahaslides-product/plugins-api | plugins-ui | plugins-common | plugins-db`.
No work beyond `npm install` (needs `GH_TOKEN`).

> ⚠️ Caveat: `plugins-ui` has been flagged as awkward to install in some CI
> contexts. If this app's CI can't pull it, fall back to `plugins-ui-vanilla` /
> `plugins-design`, or import only the utilities you actually need.

### 2. Skills — the real work: a Claude plugin
Create a plugin in the existing marketplace `AhaSlides-Product/aha-claude-plugins`
(same one `.claude/settings.json` already references for `aha-design`):

```
aha-claude-plugins/
  .claude-plugin/marketplace.json        # add an entry for the new plugin
  plugins/slide-type-kit/
    .claude-plugin/plugin.json
    skills/                              # the UI/UX + call-endpoint skills
```

- Move only the **shareable** skills out of `slide-type-creator/.claude/skills`.
  Most are internal (JIRA/staging/deploy refs — 41/47 flagged); those stay
  creator-only. Candidates to share: the UI/UX + SDK-usage ones, scrubbed of
  internal references.
- This app enables it via `.claude/settings.json` (`enabledPlugins`).
- Update once in the marketplace → `claude plugin update` in every consumer.

## This frontend shell
A plain Vite + Vue app that imports the published SDK/components and calls the
shared backend. Not a playground. See `src/lib/apiClient.ts`, `src/App.vue`.

## Public-repo guardrails
- Never commit `GH_TOKEN`; private packages install via env/CI secret only.
- Keep internal skills OUT of this public repo — reference the private plugin
  marketplace instead of copying skill files.
- The shipped bundle exposes SDK/component code (normal for frontend) → every
  `/api/*` endpoint must enforce auth server-side.
