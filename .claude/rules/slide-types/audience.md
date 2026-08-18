---
paths:
  - "src/slide-types/**/Audience.vue"
---

# Building a slide-type Audience surface (participant phone)

**Load `aha-design:aha-design-audience`** first — the audience-side iframe: mobile-first
layout, input UI, submitted/waiting feedback, height reporting.

## Data

`useAudiencePlugin()`. Submit with
`new ApiClient(baseUrl).sendLiveSubmission('<slug>', payload)`
(`senderType: SubmissionSenderType.Audience`), then
`saveSubmission({ ...payload, slideType: '<slug>' })` for local persistence. Hydrate from
`slideAttributesProps?.[<CONFIG_KEY>]` on mount **before** relying on `useSync` — the
host/DB seeds option ids + labels there; skip it and the audience submits ids the presenter
never heard of.

## Make-or-break invariants

- **Nothing paints a background — so ink tracks the deck.** The audience view is an iframe
  inside the audience app; the host owns the background at every level (root, tap rows, the
  confirmation card). Paint nothing, then ink **must** track `slideProps.textColour` — safe
  because the real backdrop is the deck's own colour, which the author picked an ink
  against. A fixed dark ink on a transparent surface is the bug that vanishes on a dark
  deck. Only a **semantic** signal — the submitted tick, a correct/incorrect badge — stays a
  bundled brand token. Audit the whole surface in one pass (root text, pills, chips,
  borders, `currentColor` tints).
- **Every colour comes from the deck theme** (`slideProps.textColour`, the palettes,
  `presentation.fontFamily`). A slide type never invents colour except a fallback, a
  semantic signal, or a prompt-requested colour noted in a comment. (`slide.baseColour` is
  presenter-only and never reaches this iframe.)
- **Reuse host capabilities** (join, timer, typing indicator) via the SDK +
  `ahaConfig.setting.enable*` flags — don't rebuild them.

Self-check the finished audience view with **`aha-design-audience-judge`**.
