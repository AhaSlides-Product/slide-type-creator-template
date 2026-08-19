---
paths:
  - "src/slide-types/**/handler.ts"
---

# Building a slide-type handler (stateless submission reducer)

A handler is only needed for a slide with **live aggregation** (counts / scores across
participants). Signature: `(SubmissionPayload) => SubmissionResult`. The same function is
deployed as a Cloudflare Worker in production and referenced from the slide type's manifest
entry as **`ahaConfig.handlerUrl`** (leave `handlerUrl: ""` for a slide with no backend).

Make-or-break invariants:

- **Stateless.** No module-level accumulation, no closures over prior submissions — the
  worker may run any instance for any request. The presenter Canvas is the only aggregator;
  the handler just maps one payload to count/score events.
- **On an EDITED answer, emit BOTH the old and the new answer key** so the count moves off
  the previous bucket. Emitting only the new key makes totals climb forever (it double-counts
  the change).
- **Emit on the exact per-key bucket the Canvas subscribes to** — the match is exact-string
  on the relative topic, so a mismatched key silently drops the count.

The audience sends into this pipeline with
`new ApiClient(baseUrl).sendLiveSubmission('<slug>', payload)`; the Canvas consumes the
aggregated result via the live hooks (`subscribeTopic` / `getValues`). Scored / leaderboard
slides use the answers pipeline instead of a plain count.
