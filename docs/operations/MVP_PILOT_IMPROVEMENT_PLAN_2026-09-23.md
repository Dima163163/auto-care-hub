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
| P1 | Redact all query strings from application request logs. OAuth callback `code` and `state` are credentials, and request URL logging could persist them. | Implemented locally in this review; not yet committed. | A callback request and error path never emit `code` or `state`; the path and method remain useful for diagnosis. |
| P1 | Distinguish “provider not found” from a provider-profile API failure, and do not describe an availability request failure as a genuinely empty schedule. | Implemented locally in this review; not yet committed. | Missing profiles retain the not-found state; failed API requests show a load error; “no times” appears only after a successful empty response. |
| P1 | Make release evidence cryptographically verifiable and bind it to a trusted source workflow run, repository, successful conclusion and exact release SHA. The current checker accepts arbitrary text as a “signature”; the repository has no evidence-producing workflow or established signer/key custody contract. | Engineering + release owner; deliberately not patched with a cosmetic check. | Tampered payload, invalid signature, untrusted signer/workflow, wrong SHA, failed run or missing artifact blocks promotion. A trusted signer and evidence-generation contract are configured before enabling the gate. |
| P1 | Require MFA or an approved SSO/step-up policy for admin and super-admin accounts, including account recovery and session revocation. | Owner decision required on IdP, recovery and staff scope; then engineering. | No privileged password-only path; recovery, step-up, session revocation and audit are exercised. |
| P1 | Add an in-chat “report conversation/message” action that reaches the existing moderation queue, with participant-only authorization, duplicate handling and clear success/error states. | Backend mutation/queue already exist; visible UX is deferred by the repository design-approval lock. | Client and provider can submit a categorized report; unauthorized participants cannot; a moderator can resolve it without leaking reporter details to the other party. |
| P1 | Close real-data operational controls: HTTPS and managed secrets, private object storage and malware scanning, Redis fail-closed across replicas, encrypted offsite backup and isolated restore, alerts and rollback evidence. | Platform/security owner and staging/production access. | Fresh, release-SHA-bound evidence for the corresponding existing V2 gates; synthetic local runs do not count. |
| P1 | Complete approved privacy/legal text, retention rules and participant consent; run independent security review before admitting real data. | Product/legal/privacy owner and independent reviewer. | Signed-off policy and participant-consent evidence; no open P0/P1 security findings. |
| P1 | Record provider supply, catalog/price coverage, service-response times and real booking completion against pre-agreed thresholds. | Marketplace/operator owner; requires consenting pilot participants. | Redacted, release-bound pilot evidence uses agreed thresholds; synthetic demo activity is excluded. |

## Recommended — polish for the first pilot cohort

| Priority | Improvement | Status / constraint | Acceptance |
| --- | --- | --- | --- |
| P2 | Complete accessible keyboard behavior for search-mode controls, or change their semantics from tabs to a mode switch. | Read-only audit found tab roles without the complete tabs keyboard/tabpanel contract; implementation must respect the design-approval lock. | Keyboard-only and screen-reader flows expose the same selected mode and active search field. |
| P2 | Turn the provider onboarding checklist into direct links to the exact profile, media, catalog and verification repair points. | Useful UX improvement, but it adds visible controls and needs design approval plus owner validation of checklist truth. | Only actionable incomplete items link to a permitted destination; branch/role access is preserved. |
| P2 | Give the booking availability failure a direct, accessible retry action and keep the selected date/context. | Current form permits changing the date; a dedicated retry control is a visible addition and is deferred pending design approval. | Transient failure is distinct from an empty schedule and retries the same provider/location/offering/date. |
| P2 | Re-check owner/service onboarding completion and verification state after every relevant update; avoid stale “ready” signals. | Code and source review can continue; claims and badge meaning require owner policy. | One policy-backed source determines checklist completion and public verification claims. |
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
2. Choose MFA/SSO, privileged roles, recovery and trusted release signer/key
   custody; identify the exact trusted workflow that generates evidence.
3. Approve privacy notice, terms, consent, chat/photo retention and deletion
   policy for the launch jurisdiction.
4. Provide isolated staging/production access, HTTPS/DNS, secret manager, private
   object storage/AV, shared Redis, backup/restore owner and alert destinations.
5. Arrange an independent security review and authorize only a synthetic or
   consented, bounded pilot after all mandatory gates are actually evidenced.
6. For visible additions (chat report, onboarding links, retry controls and
   tab/keyboard composition), first complete the project’s three explicit design
   approvals. Do not infer these from this general implementation request.
7. Recruit consenting participants and operators, then accept the end-to-end
   journeys and the first real pilot evidence together.

## Work performed during this review

- Existing uncommitted work was committed separately as
  `30d688e fix(mvp): specify booking and locale acceptance` and pushed only to
  the current feature branch. It did not touch `main` or `dev`.
- This review’s code changes remove query values from request URLs in Fastify
  logs and correct two booking error/empty-state misclassifications.
- Security, product and UX reviews were static and read-only. No browser,
  staging, production or participant acceptance is implied. Tests have not been
  run in this review.
