---
paths:
  - "src/slide-types/**/Canvas.vue"
---

# Building a slide-type Canvas surface (presenter / projector stage)

**Load `aha-design:aha-design-canvas`** first — how a slide LOOKS on the presenter/casting
canvas: the 16:9 stage, theme-driven colour, framed vs full-canvas, the control-bar.

## Data

`usePresenterPlugin()` + `useSync(...)`. Read live values through the SDK hooks
(`subscribeTopic` / `getValues`) — don't hand-roll sockets. Hydrate from
`slideAttributesProps` / `getSlideAttributesAction(slideId)` on mount **before** relying on
the live `useSync` channel — BroadcastChannel doesn't replay, so a late mount otherwise
shows defaults.

## Make-or-break invariants

- **Nothing paints a background.** The canvas is an iframe inside the presenter app, so the
  host owns the background at every level (root, panels, rows). No `bg-white`, no opaque
  self-computed "theme" box (it reads as a hard mismatched box on a gradient/image deck).
- **All ink tracks the deck theme.** Because nothing is painted, text/icons read
  `slideProps.textColour`; marks read `presentationColorPalette` /
  `presentationLighterColorPalette`; type reads `presentation.fontFamily`. A fixed dark ink
  is exactly what disappears on a dark deck. A slide type never invents colour (no raw hex,
  no brand utility) — the only exceptions are a fallback for when the host sent nothing, a
  semantic signal (correct/incorrect) paired with a non-colour cue, and a colour the user
  prompt explicitly asked for (noted in a comment at the call site).
- **`autoHeight` is a decision here, not a default.** A canvas normally fills the host's
  fixed 16:9 stage, so reporting a content height fights the stage. Enable it only when the
  slide type genuinely needs a content-driven canvas, and state why at the call site.
- **Reuse host chrome, don't rebuild it.** Title (`enableQuestionTitle`), description
  (`enableQuestionDescription`), timer, vote count, full-screen are host-rendered via the
  `ahaConfig.setting.enable*` flags in `public/manifest.json` — read `slideProps`, **do NOT
  render your own `<h1>`/`<p>` for them or the title/description paints TWICE** (once by the
  host frame, once by the iframe). The question IMAGE is the exception: `enableQuestionImage`
  only gives the presenter the host upload button — the host does not paint the image, so the
  slide renders it from `slideProps.image`. Note **`enableVoteCount` / `setSubmissionCount`
  are effectively deprecated** — the host derives the response-count badge from the backend,
  so the iframe neither renders it nor writes it.
- **Deck font: load it, don't just name it (AHAM-385).** The host forwards only the font
  NAME via `presentation.fontFamily`, and a cross-origin plugin iframe does NOT inherit the
  deck's `@font-face` — so `:style="{ fontFamily: name }"` silently falls back to system-ui
  and every glyph renders in the wrong face. On any surface that renders text, use
  **`@/iframe/deckFont`**: `useDeckFont(computed(() => presentationProps.value?.fontFamily))`
  to inject the webfont into this iframe, and `resolveFontFamily(name)` for the CSS value
  (deck family + robust sans fallback). Never bind a bare font name. The **base** brand font
  (Plus Jakarta Sans — the `resolveFontFamily` fallback and the Settings/editor font) is
  loaded once in `index.html` + applied via `--font-sans` in `src/style.css`; the SDK only
  declares `--aha-fontFamily`, it ships no webface, so without that load everything falls
  back to system sans.
- **Framed vs full-canvas must agree** between the manifest (`enableFullScreen` /
  `enableQuestionTitle`) and the root background.
- **Quiz lobby (scored slides only): start on `quizStatus`, not on `presenting`.** For a
  scored/quiz slide the host runs a lobby before Start. If the canvas starts a
  countdown/round shared with the audience over `useSync`, gate the start on
  `quizStatus !== QuizStatus.Lobby` (`quizStatus` rides on the slide prop —
  `computed(() => slideProps.value?.quizStatus)`), NOT on `presentation.presenting`, which is
  already true through the whole lobby and would stamp `startedAt` in the lobby and burn the
  audience's clock. The presenter can leave the lobby AFTER mount, so react with a
  `watch`/`computed`, not a mount-time read. Fall back to `presenting` only when
  `quizStatus === undefined`.

Self-check the finished canvas with **`aha-design-canvas-judge`**.
