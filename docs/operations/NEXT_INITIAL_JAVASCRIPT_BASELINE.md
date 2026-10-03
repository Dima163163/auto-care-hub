# Production Next initial JavaScript baseline — 2026-10-04

`check-seo-release.mjs --url <candidate-url>` now measures the distinct external
script entries in each route's initial server HTML against the selected
`NEXT_DIST_DIR`. It blocks missing/mismatched candidate assets and entries outside
the candidate origin. Bytes are read from that build, never another `dist/` or an
unrelated `.next/`. Duplicate script URLs do not count twice.

The CI production Next HTTP step runs these checks while its own freshly built
server is alive. Budgets per initial route are **1,600,000 raw bytes** and
**460,000 gzip bytes** (approximately 14% above this measured baseline). Both
limits are enforced independently; negative tests prove each can block a release.
Do not raise a budget automatically to accept a regression.

Local artifact: Next **16.3.6**, Node **24.13.1**, production mock mode,
`NEXT_DIST_DIR=.next-nonurgent-candidate`, build ID `LR785MDnvdTuC3Cxn_DSe`.
Runtime source matches the N05 follow-up `a795af6`; subsequent N06 edits change
the checker, CI and documentation. Before/after the CSP adapter correction,
initial JS was unchanged: **1,398,858 raw / 403,302 gzip bytes, 9 entries**.
This is a measurement/guard improvement, not a claimed reduction in JS payload.

| Route class | HTTP samples | Entries | Raw bytes | Gzip bytes |
| --- | --- | --- | --- | --- |
| Public / discovery / query | `/`, `/services`, `/services?service=oil-change`, `/for-owners`, `/about`, `/reviews`, `/features`, `/help`, `/agreement`, `/rules`, `/privacy` | 9 each | 1,398,858 each | 403,302 each |
| Provider | `/services/api-proservice-moscow`, `/services/api-autolux-moscow`, `/services/api-formula-moscow` | 9 each | 1,398,858 each | 403,302 each |
| Client | `/profile` | 9 | 1,398,858 | 403,302 |
| Owner | `/owner/dashboard` | 9 | 1,398,858 | 403,302 |
| Admin | `/admin/dashboard` | 9 | 1,398,858 | 403,302 |

All **17 HTTP metadata and 17 initial JS checks PASS**. The largest initial
entry is `3890-a7e454a0b050ba60.js`: **563,446 raw / 144,298 gzip bytes**, SHA-256
`52c419ce28528075acbf6778a68cd527d73ab80ccf93e0c8a3a50629eb158390`.
The routes share the current client shell, so the same initial entry set is
expected; further common-chunk/lazy-boundary work should use this baseline.

Gzip values are deterministic compression measurements of the selected files,
not observed CDN transfer sizes. All external script entries, including the
legacy-browser polyfill, are conservatively counted. Inline RSC/bootstrap HTML,
lazy-loaded JavaScript, fonts, media and later API traffic are outside this
initial-script budget; the existing total/max JS/CSS and media budgets remain.

**External acceptance remains open:** production real-mode artifact, target
device/network, Lighthouse and measured LCP/INP/CLS. A local mock artifact or a
passing byte budget does not establish Core Web Vitals or close pilot gates.
