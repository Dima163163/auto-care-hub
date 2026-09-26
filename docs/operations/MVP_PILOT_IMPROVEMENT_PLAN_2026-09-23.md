# MVP / pilot improvement plan — 2026-09-23

## Executive summary

The canonical release contract remains `PILOT_SCOPE_FREEZE.md` v2.0: 54 fixed
gates and **NO-GO for real customer data** until the required security,
operations, legal/privacy, staging and participant evidence is accepted.
This review adds no gate and changes no readiness denominator. It is a code and
workflow review, not a staging check, formal pentest or product-owner acceptance.

The site already contains the core pilot journeys: provider discovery and
comparison, provider pages, requests and quotes, customer/provider chat,
appointment changes and completion, reviews, provider workspaces, moderation,
branch access controls, private media, data export/deletion and audit trails.
The largest near-term risks are therefore truthful release evidence, privileged
account protection, operating the product safely with real data, and removing
avoidable failure ambiguity from booking and support journeys.

## Recommended — do before real-user pilot

| Priority | Improvement | Status / owner | Acceptance |
| --- | --- | --- | --- |
| P1 | Redact all query strings from application request logs. OAuth callback `code` and `state` are credentials, and request URL logging could persist them. | Implemented in `5eee151` and pushed to `dev`; log-capture regression evidence remains to be collected. | A callback request and error path never emit `code` or `state`; the path and method remain useful for diagnosis. |
| P1 | Distinguish “provider not found” from a provider-profile API failure, and do not describe an availability request failure as a genuinely empty schedule. | Implemented in `5eee151` and pushed to `dev`; automated/browser regression evidence remains to be collected. | Missing profiles retain the not-found state; failed API requests show a load error; “no times” appears only after a successful empty response. |
| P1 | Make release evidence cryptographically verifiable and bind it to a trusted source workflow run, repository, successful conclusion and exact release SHA. The former checker accepted arbitrary text as a “signature”. | Implemented in this branch: keyless GitHub/Sigstore artifact attestations, exact workflow/repository/ref/SHA checks, successful Quality-run binding, measured build and migration hashes, plus AES-256-GCM encryption because the repository is public. The owner must configure the protected `production` environment secret before dispatch. | Tampered payload, invalid attestation, untrusted signer/workflow, wrong SHA, failed run, missing artifact or invalid evidence blocks promotion. Real gate evidence and owner-controlled secret setup remain mandatory. |
| P1 | Require MFA or an approved SSO/step-up policy for admin and super-admin accounts, including account recovery and session revocation. | Owner decision required on IdP, recovery and staff scope; then engineering. | No privileged password-only path; recovery, step-up, session revocation and audit are exercised. |
| P1 | Add an in-chat “report conversation/message” action that reaches the existing moderation queue, with participant-only authorization, duplicate handling and clear success/error states. | Backend mutation/queue already exist; visible UX is deferred by the repository design-approval lock. | Client and provider can submit a categorized report; unauthorized participants cannot; a moderator can resolve it without leaking reporter details to the other party. |
| P1 | Close real-data operational controls: HTTPS and managed secrets, private object storage and malware scanning, Redis fail-closed across replicas, encrypted offsite backup and isolated restore, alerts and rollback evidence. | Platform/security owner and staging/production access. | Fresh, release-SHA-bound evidence for the corresponding existing V2 gates; synthetic local runs do not count. |
| P1 | Complete approved privacy/legal text, retention rules and participant consent; run independent security review before admitting real data. | Product/legal/privacy owner and independent reviewer. | Signed-off policy and participant-consent evidence; no open P0/P1 security findings. |
| P1 | Record provider supply, catalog/price coverage, service-response times and real booking completion against pre-agreed thresholds. | Marketplace/operator owner; requires consenting pilot participants. | Redacted, release-bound pilot evidence uses agreed thresholds; synthetic demo activity is excluded. |

## Recommended — polish for the first pilot cohort

| Priority | Improvement | Status / constraint | Acceptance |
| --- | --- | --- | --- |
| P2 | Complete accessible keyboard behavior for search-mode controls, or change their semantics from tabs to a mode switch. | Implemented behavior-only: roving tab stop, Left/Right/Home/End navigation, selected state and labelled tabpanel; no styling/layout changes. | Keyboard-only and screen-reader flows expose the same selected mode and active search field; browser acceptance remains open. |
| P2 | Turn the provider onboarding checklist into direct links to the exact profile, media, catalog and verification repair points. | Useful UX improvement, but it adds visible controls and needs design approval plus owner validation of checklist truth. | Only actionable incomplete items link to a permitted destination; branch/role access is preserved. |
| P2 | Give the booking availability failure a direct, accessible retry action and keep the selected date/context. | Current form permits changing the date; a dedicated retry control is a visible addition and is deferred pending design approval. | Transient failure is distinct from an empty schedule and retries the same provider/location/offering/date. |
| P2 | Re-check owner/service onboarding completion and verification state after every relevant update; avoid stale “ready” signals. | Audit found the generic onboarding progress is browser-local and marks a step complete as soon as its navigation link is clicked; it is not server-backed completion or verification. Do not extend this signal until the owner defines what each step means. | One policy-backed source determines each task's completion and public verification claims; browser storage cannot assert business readiness. |
| P2 | Define supported device/locale acceptance for public discovery, booking, chat and operator workspaces. | Human device, keyboard and VoiceOver/TalkBack acceptance remains open. | Evidence records tested browser/device/locale, failures and owner acceptance. |
| P2 | Keep the current map on the keyless OSM default; choose a contracted/provider-backed tile service before traffic or SLA expectations justify it. | The previous “API KEY REQUIRED” watermark issue has a documented fix: OSM is the default and CARTO is not bundled. Production quotas/SLA remain an operations choice. | No keyed watermark; attribution and fallback remain visible; production tile provider has approved quota, cost, regional coverage and rotation policy. |

## Controversial — validate with pilot data first

- **Long-wait reminders or suggestions to contact a second provider.** Could
  reduce abandonment, but may create spam or pressure users into sending their
  request to another business. First measure response latency; then offer an
  explicit, user-controlled reminder or one-time alternative, never an automatic
  cross-provider broadcast.
- **SMS/WhatsApp OTP and proactive appointment reminders.** Potentially useful
  for conversion and attendance, but add per-message costs, new personal-data
  processors, consent requirements and account-takeover/abuse paths. Choose only
  after market/legal review and measured email/push gaps.
- **Provider ranking boosts, “best” badges or automated quality scores.** These
  change marketplace incentives and can undermine trust. Do not introduce them
  until ranking inputs, appeal rights, evidence quality and labeling are agreed.
- **More live analytics and chat-presence polish.** Attractive, but can consume
  pilot capacity without improving the core request-to-completed-job outcome.
  Prioritize only against an observed operator or customer problem.

## Do not build at this stage

- Repair checkout, deposits, commissions, provider subscriptions, promo codes,
  paid ranking or payout processing. The freeze explicitly excludes them and
  payment/legal reconciliation expands the risk surface.
- Native iOS/Android apps, fleet/B2B integrations, partner APIs or new locales
  before web journeys, pilot retention and launch-market requirements are
  evidenced.
- PostGIS or a new geospatial stack without a measured discovery latency or
  quality need; current synthetic benchmarking does not establish one.
- Automatic broadcast matching, multi-provider messaging or unconsented
  location collection.
- Additional readiness percentages/gates for these optional recommendations.
  Findings stay mapped to existing V2 criteria or a separately approved
  optional backlog, never to a growing denominator.

## Joint/owner-dependent steps — leave until the end

1. Select the pilot market/providers, confirm provider claims and prices, and
   approve response/service thresholds.
2. Choose MFA/SSO, privileged roles and recovery; configure
   `RELEASE_EVIDENCE_ENCRYPTION_KEY` on the protected GitHub `production`
   environment and in the approved secret manager; supply the successful
   Quality run, encrypted evidence and target applied-migration manifest. Run
   the trusted evidence workflow from `main`, with the candidate SHA from `dev`.
3. Approve privacy notice, terms, consent, chat/photo retention and deletion
   policy for the launch jurisdiction.
4. Provide isolated staging/production access, HTTPS/DNS, secret manager, private
   object storage/AV, shared Redis, backup/restore owner and alert destinations.
5. Arrange an independent security review and authorize only a synthetic or
   consented, bounded pilot after all mandatory gates are actually evidenced.
6. For visible additions (chat report, onboarding links, retry controls or
   visual/composition changes to tabs), first complete the project’s three
   explicit design approvals. Behavior-only keyboard support is already
   implemented; do not infer approval for visual changes from this request.
7. Recruit consenting participants and operators, then accept the end-to-end
   journeys and the first real pilot evidence together.

## Work performed during this review

- Existing uncommitted work was committed separately as
  `30d688e fix(mvp): specify booking and locale acceptance` and pushed first to
  the current feature branch.
- This review’s code changes in `5eee151 fix(pilot): redact OAuth logs and
  clarify booking errors` remove query values from Fastify logs and correct two
  booking error/empty-state misclassifications. Both commits are now on `dev`;
  `main` is being handled by the repository’s verified promotion PR/workflow.
- Security, product and UX reviews were static and read-only. No browser,
  staging, production or participant acceptance is implied. Tests have not been
  run in this review.
- This follow-up branch implements encrypted evidence handling, keyless Sigstore
  attestations and exact-run/SHA verification. It is not usable until the owner
  configures the protected environment secret and provides fresh real evidence.
- Search-mode tabs now have keyboard navigation and ARIA panel associations
  without appearance changes; human accessibility verification is still open.

## Runtime verification follow-up — 2026-09-23

- Backend unit suite passed after the discovery fix: 302 files / 1,106 tests;
  focused launch-market tests passed 7/7. Frontend Vitest passed: 172 files /
  536 tests. Backend build, lint, SEO checks and `git diff --check` passed. The
  CI-only PostgreSQL concurrency fixture has not been run against the local
  database.
- Read-only browser smoke covered signed-out, client, owner, staff-like, admin
  and super-admin roles. Admin could not open the super-admin dashboard. No
  marketplace/business mutations were submitted. The demo staff account has no
  provider branch membership, so it does not establish a branch-scoped staff
  journey.
- Fixed P0/P1 local finding: the launch-ready market query selected `id` and
  `countryId` but omitted `launchReady`, while a shared policy helper filtered
  on that missing value and rejected every candidate market. The select now
  includes the required flag and a regression test asserts it. After rebuilding,
  both HTTP searches (10 km and 50 km) return ProService at about 3.1 km; the
  browser renders the service card and matching map marker. Opening its booking
  link while signed out correctly redirects to login; no booking was submitted.
- Remaining pilot UX truthfulness findings: the home page still shows fixed
  “3 216” and static map price/rating markers instead of live supply; the search
  page renders “1 сервисов найдено” for one result; observed demo totals differ
  between the public provider card (256 reviews) and owner review list (12).
  Clarify count meaning/source and approve text/layout changes before altering
  the UI; these are not hidden by the discovery fix.
- Local super-admin operations panel showed 126 dead-letter events, 208 open
  incidents (187 critical), Redis disabled, antivirus disabled and filesystem
  media storage. Its separate quality-queue panel said the queues were empty;
  verify that those distinct scopes are clear to operators. These are local
  environment/data observations, not production evidence. Seeded client data
  also includes past pending appointment dates; the market administration list
  contains two `Capacity Test` rows and test-like identities remain visible in
  the user directory (their origin was not changed or assumed).
- The browser needed an exact temporary `CORS_ORIGIN=http://127.0.0.1:5181`
  because the checked-in local allowlist uses `http://localhost:5173`; this was
  process-only and not saved to project configuration. The usual port 5173 was
  already occupied by an unrelated local project.
- No reset, seed, migration, commit or push was performed during this runtime
  follow-up. No booking, quote, moderation, catalog, market or trust-policy
  business record was changed. Expected persistent side effects are demo-user
  sign-in/out session revocation, security/audit telemetry, and public
  profile/discovery observation metrics generated by normal GET routes.
