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
- **Deck font: load it, don't just name it (AHAM-385).** The host forwards only the font
  NAME; a cross-origin iframe does NOT inherit the deck's `@font-face`, so a bare
  `fontFamily: <name>` renders in system-ui. Use **`@/iframe/deckFont`** —
  `useDeckFont(computed(() => presentationProps.value?.fontFamily))` to inject the webfont
  into this iframe, and `resolveFontFamily(name)` for the CSS value on the root.
- **Don't rebuild host chrome.** The question title (`enableQuestionTitle`) is host-rendered
  on the audience screen — read `slideProps`, don't add your own `<h2>{{ title }}</h2>` or it
  shows twice.
- **The submission lock is optimistic, and it ROLLS BACK.** Write the lock on tap so the
  phone confirms instantly, then **release it if `sendLiveSubmission` rejects** and say so
  on screen. A lock written before the request resolves and never undone is worse than no
  lock: it is durable by design (it survives a remount), so one dropped request on
  conference wifi leaves that participant permanently "submitted" for a vote no handler
  counted. A `.catch` that only `console.error`s is not error handling — the participant
  can't open that console. **Only the server call may trigger the rollback:**
  `saveSubmission` is a local IndexedDB mirror that fails on its own terms (private mode,
  quota) — give it its OWN catch, or its rejection un-locks a vote the handler already
  counted and hands that participant a second ballot.
- **Reuse host capabilities** (join, timer, typing indicator, image upload, identity) via
  the SDK + `ahaConfig.setting.enable*` flags in `public/manifest.json` — don't rebuild them
  or prompt for a name/run your own timer.
- **Quiz lobby (scored slides only): gate on `quizStatus`, show a waiting screen.** For a
  scored/quiz slide the presenter holds everyone in a lobby until they hit Start.
  `quizStatus` rides on the slide prop — derive
  `const quizStatus = computed(() => slideProps.value?.quizStatus)`, compute
  `inLobby = quizStatus === QuizStatus.Lobby`, and while `inLobby` render a "waiting for the
  host" screen with `v-if="!inLobby"` on the question, options, timer AND submit — hiding
  only the timer lets phones answer before Start. `undefined` = no lobby ⇒ show the question
  (fail-open). Keep it a `computed` (it changes live), never a mount-time read.

## Not done until the judge passes

Rendering is a draft, not a finish line. Run the finished audience view through
**`aha-design-audience-judge`**, fix **every** FAIL, and re-judge until the verdict reads `OK TO SHIP`.

- **Judge against the marketplace's `origin/main`, not the local plugin copy.** That
  cache goes stale (observed hundreds of commits behind), so judging from it checks last
  month's rules. `git fetch origin` in
  `~/.claude/plugins/marketplaces/aha-claude-plugins` and
  `git show origin/main:plugins/aha-design/skills/aha-design-audience-judge/SKILL.md`,
  or refresh with `/plugin`.
- **Read every criterion; don't grep.** Walking the list is what surfaces the failures
  you didn't already suspect.
- **Prove each PASS by measuring** in the browser (`getBoundingClientRect` /
  `getComputedStyle`) and quote the number. The judge puts the burden of proof on PASS —
  a criterion you cannot verify is a FAIL, not a benefit of the doubt.
