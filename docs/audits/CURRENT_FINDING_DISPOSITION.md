# Current finding disposition — 2026-10-04

The dated reports preserve what was observed then. Their original open wording is
historical, not a current backlog. The [working registry](FULL_PROJECT_AUDIT_2026-10-03.md)
contains current U/N evidence and pending acceptance. The 54-gate freeze remains
canonical; neither source presence nor local PASS changes external pilot readiness.

| Historical finding | Current implementation/evidence | Remaining acceptance |
| --- | --- | --- |
| CHANGE-C001, private WS after revocation | `service-chat.gateway.ts` serializes authorization promises and rechecks access before delivery/periodically; existing gateway regression suite | Deployed identity/revocation replay and independent security review |
| CHANGE-C002, stale quote consent | `autocare-request.service.ts` compares quoteId/version under transaction before acceptance; frozen-price integration exists | Current candidate real-stack regression and production acceptance |
| CHANGE-C003, cancel/complete deletion | `account-deletion.service.ts` uses pessimistic row locks and an idempotent cancelled row; account-deletion integration exists | Recovery/retention/legal and staging concurrency evidence |
| CHANGE-C008, wrong frontend runtime in CI | Required real-full-stack runs production Next artifact; previous published Quality runs PASS | New candidate Quality and deployed URL evidence |
| CHANGE-C009, failed logout/late refresh | Identity invalidation and refresh epoch checks exist in auth/baseApi; current 171 mock/26 existing real-API cases PASS, including failed/offline logout | A→B and deployed production acceptance |
| Product A21, chat report queue truncation | `listAdminAutoCareChatReports` implements cursor/totalCount/search/assignment/category/scope. `AdminChatReportsPanel` includes page continuation and filters; boundary/UI tests exist | Fresh UI regression and 101+ real queue acceptance; source proof alone does not close the entire historical criterion |
| Product A29, generic empty provider HTML | Provider route server-loads a public profile, generates provider title/description and renders `PublicProviderFirstPaint` with profile H1/content; missing provider is noindex | Fresh candidate HTTP/body checks and deployed SEO/Lighthouse; do not call ISR static when route is force-dynamic |
| Security 26 Sep, fields “not encrypted” | Versioned AES-GCM field envelopes/HMAC indexes are implemented. U05 stable index-key KEK rotation, U06 invitation transformer and U09 log redaction are published and verified | U01 external KMS wiring; U02 row/parent scope integrity; N09 production migration/retirement |
| Security 26 Sep, CBC backup/stream restore | Published U04 authenticates ACHBKP01 AES-GCM and stages complete gzip/SQL before consumer; negative tooling and CI PASS | External backup/key separation, live restore/RPO/RTO and historical archive decision |
| Security 26 Sep, private cache coverage | Published U10 applies path-normalized sensitive `private, no-store` barrier; CI HTTP assertions PASS | Production proxy/cache and client identity storage acceptance |
| Privileged MFA/step-up | U03 remains open; emergencyReason/audit is not MFA | Owner IdP/MFA/recovery choice, actual privileged-login and step-up replay |
| Next PWA | N03 removes unsupported production claim; Vite PWA is compatibility-only | Separate Next install/offline/update/cache implementation and browser acceptance |

No report here claims there is no encryption or that server-side encryption hides
all data from a fully compromised authorized backend. Historical archives and
unrelated dirty files were neither edited nor committed; their hashes were
verified. Urgent baseline is main `a29b361`. The nonurgent packet's local results
and remaining N09/N11 scope are in the current working registry. Publication and
hosted acceptance are verified through the exact-candidate dev→main PR/Actions.
