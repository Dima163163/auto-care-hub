# Индекс документации AutoCare Hub

Срез remote dev `8840ae8`, локальная fix-ветка `26da803`, 21 октября 2026.
Начать с [карты PlantUML](diagrams/README.md) и
[итоговой проверки пилота](audits/PILOT_READINESS_RECHECK_2026-10-21.md).
Повторная проверка всех отслеживаемых файлов: [file recheck](audits/REPOSITORY_FILE_RECHECK_2026-10-21.md).

**Полная semantic сверка не завершена.** Этот индекс учитывает каждый найденный
text/spec документ, PlantUML и SVG/HTML reference; статус указан для каждого файла.
Не проверенные документы перечислены явно, не считаются актуальными по умолчанию.
Подробное покрытие и исключённые supporting images: [docs-coverage.json](audits/evidence/2026-10-20/docs-coverage.json).
Новый аудит: [UI/security recheck](audits/UI_SECURITY_RECHECK_2026-10-20.md).

В ссылках ниже показаны пути от корня repo; цели ссылок относительно `docs/`.
«Сверено частично» означает проверку только указанных UI/security/navigation claims.
Историческая дата/название документа не означает действующую архитектуру.

## Корень / инструкции

| Документ / назначение | Тип | Покрытие | Связь с кодом |
| --- | --- | --- | --- |
| [AGENTS.md](../AGENTS.md) — Agent Instructions | текущий документ / статус реализации не сверён | сверено частично | docs/diagrams/, Git branch/status |
| [ARCHITECTURE.md](../ARCHITECTURE.md) — AutoCare Hub — Architecture | целевая архитектура с частично реализованными срезами | сверено частично | Next/Fastify baseline и границы будущего billing; детали реализации не проверены целиком |
| [CLAUDE.md](../CLAUDE.md) — AutoCare Hub Claude Code Instructions | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [FRONTEND_REVIEW.md](../FRONTEND_REVIEW.md) — Legacy cabinet-booking Frontend Baseline Review | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [GEMINI.md](../GEMINI.md) — AutoCare Hub Project Instructions | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) — AutoCare Hub Project Context | текущий документ / статус реализации не сверён | сверено частично | Git branch; docs/audits/; docs/diagrams/ |
| [PROJECT_PLAN.md](../PROJECT_PLAN.md) — AutoCare Hub — Project Plan | текущий документ / статус реализации не сверён | сверено частично | docs/audits/UI_SECURITY_RECHECK_2026-10-20.md |
| [README.md](../README.md) — AutoCare Hub | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [SECURITY.md](../SECURITY.md) — Security Overview — Current Platform Baseline | текущий security baseline | сверено частично; исправлены cookie/hash и устаревшие finding status | auth-cookie.ts, auth.service.ts, service-chat.gateway.ts, request-quote.service.ts, account-deletion.service.ts |
| [SECURITY_CONTEXT.md](../SECURITY_CONTEXT.md) — AutoCare Hub Security Context | текущий документ / статус реализации не сверён | сверено частично | server/src/modules/autocare/{provider,request,chat}-access.service.ts |
| [SKILLS.md](../SKILLS.md) — Project Skills | текущий документ / статус реализации не сверён | сверено частично | src/, server/src/ |
| [docs/agent-rules/coding.md](agent-rules/coding.md) — Coding Rules | текущий документ / статус реализации не сверён | сверено частично | AGENTS.md; repository layout |
| [docs/agent-rules/project-structure.md](agent-rules/project-structure.md) — Project Structure | текущий документ / статус реализации не сверён | сверено частично | AGENTS.md; repository layout |
| [docs/agent-rules/subagents.md](agent-rules/subagents.md) — Subagent Rules | текущий документ / статус реализации не сверён | сверено частично | AGENTS.md; repository layout |
| [docs/agent-rules/workflow.md](agent-rules/workflow.md) — Workflow Rules | текущий документ / статус реализации не сверён | сверено частично | AGENTS.md; repository layout |

## Другие руководства / archive

| Документ / назначение | Тип | Покрытие | Связь с кодом |
| --- | --- | --- | --- |
| [docs/API_CONTRACT.md](API_CONTRACT.md) — AutoCare Hub API Contract | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/CONCURRENCY_TEST_MATRIX.md](CONCURRENCY_TEST_MATRIX.md) — Concurrency Test Matrix | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/CUSTOMER_HANDOFF.md](CUSTOMER_HANDOFF.md) — AutoCare Hub Customer Handoff | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/DATA_RETENTION.md](DATA_RETENTION.md) — Data Retention Policy | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/FINANCIAL_DATA_RETENTION.md](FINANCIAL_DATA_RETENTION.md) — Financial Data Retention Contract | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/INCIDENT_RUNBOOK.md](INCIDENT_RUNBOOK.md) — AutoCare Hub Incident Runbook | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/MAP_PROVIDER.md](MAP_PROVIDER.md) — Catalog Map Provider | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/MIGRATION_AUDIT.md](MIGRATION_AUDIT.md) — Legacy Cabinet Booking -> AutoCare Hub Migration Audit | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/OBSERVABILITY.md](OBSERVABILITY.md) — Observability Runbook | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/PHASE_L_DESIGN_QA.md](PHASE_L_DESIGN_QA.md) — Phase L Design QA Checklist | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) — Production Readiness Checklist | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/PROVIDER_CONFIGURATION.md](PROVIDER_CONFIGURATION.md) — Provider Configuration Handoff | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) — Release Checklist | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/REPOSITORY_PROTECTION.md](REPOSITORY_PROTECTION.md) — Repository protection policy | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/SEO_PRERENDER_MEDIA_BUDGET.md](SEO_PRERENDER_MEDIA_BUDGET.md) — SEO, prerender and media budget gate | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/archive/bookly/commission-removal-2026-08-27.md](archive/bookly/commission-removal-2026-08-27.md) — Legacy commission module removal | исторический архив | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/archive/bookly/e2e/README.md](archive/bookly/e2e/README.md) — Archived Bookly browser checks | исторический архив | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/archive/bookly/owner-action-center/README.md](archive/bookly/owner-action-center/README.md) — Archived owner action center | исторический архив | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/archive/translations/README.md](archive/translations/README.md) — Archived translation monoliths | исторический архив | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/backend-api-parity.md](backend-api-parity.md) — Backend/API parity | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/location-zone-catalog.md](location-zone-catalog.md) — AutoCare location-zone catalog | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/native/MOBILE_READINESS_GATE.md](native/MOBILE_READINESS_GATE.md) — Native mobile readiness gate | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/notification-delivery-semantics.md](notification-delivery-semantics.md) — Notification Delivery Semantics | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/specs/MVP_BOOKING_QUOTE_SPEC.md](specs/MVP_BOOKING_QUOTE_SPEC.md) — Спецификация MVP: дата записи и согласие с версией сметы | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [server/README.md](../server/README.md) — AutoCare Hub Server — Migration Baseline | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [server/docs/security/FIELD_ENCRYPTION.md](../server/docs/security/FIELD_ENCRYPTION.md) — Field encryption status | текущий security baseline | сверено частично | outbox transformer, migration 178642, U01/U02 external limits |
| [src/shared/styles/vendor/README.md](../src/shared/styles/vendor/README.md) — Vendored static stylesheet | текущий документ / статус реализации не сверён | исключено | src/shared/styles/vendor/ |
| [src/shared/styles/vendor/shadcn-LICENSE.md](../src/shared/styles/vendor/shadcn-LICENSE.md) — shadcn-LICENSE | текущий документ / статус реализации не сверён | исключено | src/shared/styles/vendor/ |

## Аудиты и безопасность

| Документ / назначение | Тип | Покрытие | Связь с кодом |
| --- | --- | --- | --- |
| [docs/SECURITY_AUDIT_2026-09-26.md](SECURITY_AUDIT_2026-09-26.md) — Аудит защиты данных AutoCare Hub — 26 сентября 2026 | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/audits/CURRENT_FINDING_DISPOSITION.md](audits/CURRENT_FINDING_DISPOSITION.md) — Current finding disposition — 2026-10-04 | рабочий реестр / текущая disposition / новый отчёт | сверено частично | server/src/modules/autocare/; working audit registry |
| [docs/audits/DEEP_PROJECT_AUDIT_2026-10-13.md](audits/DEEP_PROJECT_AUDIT_2026-10-13.md) — Углублённый аудит AutoCare Hub — 13 октября 2026 | audit/evidence history | сверено частично | server/src/modules/; evidence/2026-10-13/ |
| [docs/audits/FINAL_REHEARSAL_2026-09-26.md](audits/FINAL_REHEARSAL_2026-09-26.md) — Финальная репетиция ролей и сценариев — 26 сентября 2026 | audit/evidence history | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/audits/FULL_PROJECT_AUDIT_2026-10-03.md](audits/FULL_PROJECT_AUDIT_2026-10-03.md) — Дополнительный полный аудит AutoCare Hub — 3 октября 2026 | рабочий реестр / текущая disposition / новый отчёт | сверено частично | evidence/2026-10-20/; server/src/modules/ |
| [docs/audits/PILOT_READINESS_RECHECK_2026-10-21.md](audits/PILOT_READINESS_RECHECK_2026-10-21.md) — Итоговая локальная проверка для пилота | текущий локальный аудит / pilot disposition | проверено в указанном объёме | quality logs, U14 PostgreSQL smoke, npm audit, 54-gate scope |
| [docs/audits/REPOSITORY_FILE_RECHECK_2026-10-21.md](audits/REPOSITORY_FILE_RECHECK_2026-10-21.md) — Повторная проверка всех отслеживаемых файлов | текущий локальный audit/inventory | проверено в указанном объёме; semantic review ограничен | Git inventory, syntax/build/tests, security source, docs links |
| [docs/audits/PRODUCT_AUDIT_2026-09-25.md](audits/PRODUCT_AUDIT_2026-09-25.md) — Продуктовый аудит AutoCare Hub — 25 сентября 2026 | audit/evidence history | сверено частично | src/pages/autocare-results/; src/pages/autocare-request/ |
| [docs/audits/RUNTIME_VERIFICATION_2026-10-13.md](audits/RUNTIME_VERIFICATION_2026-10-13.md) — Продолжение аудита: PostgreSQL, Redis, recovery и live API — 13 октября 2026 | audit/evidence history | сверено частично | package-lock.json; server/package-lock.json |
| [docs/audits/SELECTED_DESIGN_IMPLEMENTATION_2026-10-04.md](audits/SELECTED_DESIGN_IMPLEMENTATION_2026-10-04.md) — Применённые варианты дизайна — 2026-10-04 | audit/evidence history | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/audits/UI_SECURITY_RECHECK_2026-10-20.md](audits/UI_SECURITY_RECHECK_2026-10-20.md) — Повторный аудит интерфейса, дизайна и безопасности — 20 октября 2026 | рабочий реестр / текущая disposition / новый отчёт | сверено частично | evidence/2026-10-20/; relevant source links |
| [docs/audits/UI_UX_AUTONOMOUS_2026-10-04.md](audits/UI_UX_AUTONOMOUS_2026-10-04.md) — Автономные исправления и UI/UX-приёмка — 04.10.2026 | audit/evidence history | сверено частично | scripts/audit-ui-ux.mjs; src/shared/ui/ |
| [docs/security/CHAT_REPORT_ENFORCEMENT_POLICY_DRAFT_2026-09-24.md](security/CHAT_REPORT_ENFORCEMENT_POLICY_DRAFT_2026-09-24.md) — Draft: proportionate enforcement for chat reports | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/security/LOCAL_SECURITY_REVIEW_2026-08-27.md](security/LOCAL_SECURITY_REVIEW_2026-08-27.md) — AutoCare Hub — local backend security review (2026-08-27) | текущий документ / статус реализации не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/security/THREAT_MODEL.md](security/THREAT_MODEL.md) — AutoCare Hub web threat model | текущий документ / статус реализации не сверён | сверено частично | server/src/app.ts; server/src/modules/autocare/ |

## Архитектура / ADR

| Документ / назначение | Тип | Покрытие | Связь с кодом |
| --- | --- | --- | --- |
| [docs/adr/0001-evolve-existing-typescript-stack.md](adr/0001-evolve-existing-typescript-stack.md) — ADR-0001: Evolve the existing TypeScript stack | ADR / историческое решение | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/adr/0002-web-first-and-native-readiness-gate.md](adr/0002-web-first-and-native-readiness-gate.md) — ADR-0002: Web first with a native readiness gate | ADR / историческое решение | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/adr/0003-separate-repair-payments-subscriptions-and-bonuses.md](adr/0003-separate-repair-payments-subscriptions-and-bonuses.md) — ADR-0003: Separate repair payments, subscriptions and bonuses | ADR / историческое решение | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/adr/0004-durable-service-conversations-and-quotes.md](adr/0004-durable-service-conversations-and-quotes.md) — ADR-0004: Durable service conversations and versioned quotes | ADR / историческое решение | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/adr/0005-provider-membership-authorization.md](adr/0005-provider-membership-authorization.md) — ADR-0005: Provider membership is the authorization boundary | ADR / историческое решение | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/adr/0006-provider-scoped-bonus-ledger.md](adr/0006-provider-scoped-bonus-ledger.md) — ADR-0006: Provider-scoped bonus ledger | ADR / историческое решение | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/adr/0007-portable-geospatial-discovery.md](adr/0007-portable-geospatial-discovery.md) — ADR-0007: Portable indexed geospatial discovery for the launch | ADR / историческое решение | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/architecture/AUTOCARE_RESPONSIBILITIES.md](architecture/AUTOCARE_RESPONSIBILITIES.md) — AutoCare responsibility map | архитектурный контракт / reference; текущий статус не обобщён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/architecture/FUTURE_DATA_RESIDENCY.md](architecture/FUTURE_DATA_RESIDENCY.md) — Будущая региональная архитектура и резидентность данных | архитектурный контракт / reference; текущий статус не обобщён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/architecture/autocare-api-v1.yaml](architecture/autocare-api-v1.yaml) — autocare-api-v1 | архитектурный контракт / reference; текущий статус не обобщён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/architecture/delivery-plan.yaml](architecture/delivery-plan.yaml) — delivery-plan | предложенный архитектурный план / reference | синтаксис проверен; семантика частично | PROJECT_PLAN.md; YAML line 28 исправлена |
| [docs/architecture/domain-model.yaml](architecture/domain-model.yaml) — domain-model | архитектурный контракт / reference; текущий статус не обобщён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/architecture/legacy-migration-map.yaml](architecture/legacy-migration-map.yaml) — legacy-migration-map | архитектурный контракт / reference; текущий статус не обобщён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |

## Дизайн и продукт

| Документ / назначение | Тип | Покрытие | Связь с кодом |
| --- | --- | --- | --- |
| [docs/design/approved-desktop-baseline.md](design/approved-desktop-baseline.md) — Legacy desktop baseline — retained for migration reference | design contract / proposal direction | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/approved-homepage-direction.md](design/approved-homepage-direction.md) — Legacy homepage direction — retained for migration reference | design contract / proposal direction | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/autocare-design-brief.md](design/autocare-design-brief.md) — AutoCare Hub — design brief | design contract / proposal direction | сверено частично | src/index.css:10; src/pages/autocare-home/ |
| [docs/design/autocare-interaction-state-contract.md](design/autocare-interaction-state-contract.md) — AutoCare Hub — interaction and state contract | design contract / proposal direction | сверено частично | src/pages/autocare-request/; src/pages/autocare-results/; src/entities/automotive-service/ui/ServiceRequestChat.tsx |
| [docs/design/design-token-contract.md](design/design-token-contract.md) — AutoCare Hub Design Token Contract | design contract / proposal direction | сверено частично | src/index.css; scripts/check-design-tokens.mjs |
| [docs/design/font-license-contract.md](design/font-license-contract.md) — AutoCare Hub font license contract | design contract / proposal direction | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/footer-route-contract.md](design/footer-route-contract.md) — AutoCare Hub footer route contract | design contract / proposal direction | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/interaction-state-contract.md](design/interaction-state-contract.md) — Legacy Interaction State Contract | design contract / proposal direction | сверено частично | src/shared/ui/confirm-dialog/; scripts/check-interaction-state-contract.mjs |
| [docs/design/logo-options.md](design/logo-options.md) — AutoCare Hub — logo directions for review | design contract / proposal direction | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-08-01-v2-desktop/README.md](design/proposals/2026-08-01-v2-desktop/README.md) — AutoCare Hub desktop proposal suite, revision 2 | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-08-01/README.md](design/proposals/2026-08-01/README.md) — AutoCare Hub visual proposal suite | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-08-02-home-variants/README.md](design/proposals/2026-08-02-home-variants/README.md) — AutoCare Hub homepage directions | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-08-02-v3-desktop/README.md](design/proposals/2026-08-02-v3-desktop/README.md) — AutoCare Hub desktop proposal suite, revision 3 | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-08-03-footer-pages/README.md](design/proposals/2026-08-03-footer-pages/README.md) — AutoCare Hub footer-linked public page proposals | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-08-03-pwa-mobile/README.md](design/proposals/2026-08-03-pwa-mobile/README.md) — AutoCare Hub PWA/mobile proposal suite | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-08-03-tablet/README.md](design/proposals/2026-08-03-tablet/README.md) — AutoCare Hub tablet proposal suite | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-08-04-missing-pages/README.md](design/proposals/2026-08-04-missing-pages/README.md) — AutoCare Hub missing-page desktop proposal suite | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-a21-a29/README.md](design/proposals/2026-09-26-a21-a29/README.md) — Предложение по A21 и A29 — 26 сентября 2026 | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-final-pass/README.md](design/proposals/2026-09-26-final-pass/README.md) — 01. Give the user-page heading an opaque surface | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/README.md](design/proposals/2026-09-26-svg-refresh/README.md) — AutoCare Hub — SVG личных кабинетов и панелей управления | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/product/BONUS_POLICY.md](product/BONUS_POLICY.md) — Политика бонусов AutoCare Hub | product policy / acceptance template | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/product/LEGAL_PUBLICATION_CHECKLIST.md](product/LEGAL_PUBLICATION_CHECKLIST.md) — Legal publication checklist | product policy / acceptance template | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/product/MONETIZATION_GATE.md](product/MONETIZATION_GATE.md) — Excluded commercial scope | product policy / acceptance template | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/product/MVP_POLICY_BASELINE.md](product/MVP_POLICY_BASELINE.md) — AutoCare Hub — MVP policy baseline | product policy / acceptance template | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/product/OPEN_DECISIONS.md](product/OPEN_DECISIONS.md) — AutoCare Hub — Open Product Decisions | product policy / acceptance template | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/product/PUBLIC_DESIGN_STATE_MATRIX.md](product/PUBLIC_DESIGN_STATE_MATRIX.md) — Public design state matrix | product policy / acceptance template | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/product/RESPONSIVE_ACCESSIBILITY_LOCALE_MATRIX.md](product/RESPONSIVE_ACCESSIBILITY_LOCALE_MATRIX.md) — Responsive, accessibility and localization matrix | product policy / acceptance template | сверено частично | scripts/audit-ui-ux.mjs |
| [docs/design/proposals/2026-09-26-a21-a29/a21-report-queue.svg](design/proposals/2026-09-26-a21-a29/a21-report-queue.svg) — a21-report-queue | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-a21-a29/a29-public-profile.svg](design/proposals/2026-09-26-a21-a29/a29-public-profile.svg) — a29-public-profile | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/favicon-proposal.svg](design/proposals/2026-09-26-svg-refresh/assets/favicon-proposal.svg) — favicon-proposal | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/logo-option-a-road-wheel.svg](design/proposals/2026-09-26-svg-refresh/assets/logo-option-a-road-wheel.svg) — logo-option-a-road-wheel | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/logo-option-b-hub-nut.svg](design/proposals/2026-09-26-svg-refresh/assets/logo-option-b-hub-nut.svg) — logo-option-b-hub-nut | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/logo-option-c-monogram.svg](design/proposals/2026-09-26-svg-refresh/assets/logo-option-c-monogram.svg) — logo-option-c-monogram | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/provider-placeholder-proposal.svg](design/proposals/2026-09-26-svg-refresh/assets/provider-placeholder-proposal.svg) — provider-placeholder-proposal | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/service-pattern-proposal.svg](design/proposals/2026-09-26-svg-refresh/assets/service-pattern-proposal.svg) — service-pattern-proposal | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/theme-moon-proposal.svg](design/proposals/2026-09-26-svg-refresh/assets/theme-moon-proposal.svg) — theme-moon-proposal | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/theme-sun-proposal.svg](design/proposals/2026-09-26-svg-refresh/assets/theme-sun-proposal.svg) — theme-sun-proposal | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/assets/wheel-send-proposal.svg](design/proposals/2026-09-26-svg-refresh/assets/wheel-send-proposal.svg) — wheel-send-proposal | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/design/proposals/2026-09-26-svg-refresh/preview.html](design/proposals/2026-09-26-svg-refresh/preview.html) — preview | визуальное предложение / reference asset | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |

## Диаграммы

| Документ / назначение | Тип | Покрытие | Связь с кодом |
| --- | --- | --- | --- |
| [docs/diagrams/01-system-context.puml](diagrams/01-system-context.puml) — 01-system-context | PlantUML architecture map | не проверено | docs/diagrams/sources.json |
| [docs/diagrams/02-runtime.puml](diagrams/02-runtime.puml) — 02-runtime | PlantUML architecture map | не проверено | docs/diagrams/sources.json |
| [docs/diagrams/03-frontend.puml](diagrams/03-frontend.puml) — 03-frontend | PlantUML architecture map | сверено частично | src/app/routes/route-groups.tsx; src/entities/automotive-service/api/ |
| [docs/diagrams/04-backend.puml](diagrams/04-backend.puml) — 04-backend | PlantUML architecture map | не проверено | docs/diagrams/sources.json |
| [docs/diagrams/05-domain-data.puml](diagrams/05-domain-data.puml) — 05-domain-data | PlantUML architecture map | не проверено | docs/diagrams/sources.json |
| [docs/diagrams/06-request-workflow.puml](diagrams/06-request-workflow.puml) — 06-request-workflow | PlantUML architecture map | не проверено | docs/diagrams/sources.json |
| [docs/diagrams/07-auth-session.puml](diagrams/07-auth-session.puml) — 07-auth-session | PlantUML architecture map | сверено частично | server/src/modules/auth/; src/shared/api/ |
| [docs/diagrams/08-outbox-maintenance.puml](diagrams/08-outbox-maintenance.puml) — 08-outbox-maintenance | PlantUML architecture map | сверено частично | server/src/modules/outbox/outbox.service.ts |
| [docs/diagrams/09-access-privacy.puml](diagrams/09-access-privacy.puml) — 09-access-privacy | PlantUML architecture map | сверено частично | server/src/modules/autocare/{request,chat}-access.service.ts |
| [docs/diagrams/README.md](diagrams/README.md) — Карта проекта AutoCare Hub | текущий документ / статус реализации не сверён | сверено частично | docs/diagrams/sources.json |
| [docs/diagrams/_style.puml](diagrams/_style.puml) — _style | PlantUML source / shared style | не проверено | docs/diagrams/sources.json |
| [docs/diagrams/rendered/01-system-context.svg](diagrams/rendered/01-system-context.svg) — 01-system-context | производный SVG preview | структурная проверка | docs/diagrams/01-system-context.puml |
| [docs/diagrams/rendered/02-runtime.svg](diagrams/rendered/02-runtime.svg) — 02-runtime | производный SVG preview | структурная проверка | docs/diagrams/02-runtime.puml |
| [docs/diagrams/rendered/03-frontend.svg](diagrams/rendered/03-frontend.svg) — 03-frontend | производный SVG preview | структурная проверка | docs/diagrams/03-frontend.puml |
| [docs/diagrams/rendered/04-backend.svg](diagrams/rendered/04-backend.svg) — 04-backend | производный SVG preview | структурная проверка | docs/diagrams/04-backend.puml |
| [docs/diagrams/rendered/05-domain-data.svg](diagrams/rendered/05-domain-data.svg) — 05-domain-data | производный SVG preview | структурная проверка | docs/diagrams/05-domain-data.puml |
| [docs/diagrams/rendered/06-request-workflow.svg](diagrams/rendered/06-request-workflow.svg) — 06-request-workflow | производный SVG preview | структурная проверка | docs/diagrams/06-request-workflow.puml |
| [docs/diagrams/rendered/07-auth-session.svg](diagrams/rendered/07-auth-session.svg) — 07-auth-session | производный SVG preview | структурная проверка | docs/diagrams/07-auth-session.puml |
| [docs/diagrams/rendered/08-outbox-maintenance.svg](diagrams/rendered/08-outbox-maintenance.svg) — 08-outbox-maintenance | производный SVG preview | структурная проверка | docs/diagrams/08-outbox-maintenance.puml |
| [docs/diagrams/rendered/09-access-privacy.svg](diagrams/rendered/09-access-privacy.svg) — 09-access-privacy | производный SVG preview | структурная проверка | docs/diagrams/09-access-privacy.puml |

## Эксплуатация

| Документ / назначение | Тип | Покрытие | Связь с кодом |
| --- | --- | --- | --- |
| [docs/operations/BACKEND_TEST_PROFILES.md](operations/BACKEND_TEST_PROFILES.md) — Backend test profiles | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/BACKUP_RESTORE_EVIDENCE_TEMPLATE.md](operations/BACKUP_RESTORE_EVIDENCE_TEMPLATE.md) — Backup and restore evidence template | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/BACKUP_RESTORE_RUNBOOK.md](operations/BACKUP_RESTORE_RUNBOOK.md) — Backup, restore and alert rehearsal | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/BOOKING_MEDIA_RELIABILITY_STATUS_2026-08-24.md](operations/BOOKING_MEDIA_RELIABILITY_STATUS_2026-08-24.md) — Booking, media and notification reliability — 2026-08-24 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/BROWSER_RELEASE_AUDIT_2026-08-25.md](operations/BROWSER_RELEASE_AUDIT_2026-08-25.md) — Browser release audit — 2026-08-25 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/CONCURRENCY_MATRIX.md](operations/CONCURRENCY_MATRIX.md) — Booking concurrency matrix | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/DISCOVERY_BENCHMARK.md](operations/DISCOVERY_BENCHMARK.md) — Discovery benchmark | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/ENCRYPTION_BACKFILL_ROLLOUT.md](operations/ENCRYPTION_BACKFILL_ROLLOUT.md) — Encryption backfill rollout — N09 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/FINAL_PROJECT_AUDIT_2026-09-05.md](operations/FINAL_PROJECT_AUDIT_2026-09-05.md) — Финальная ревизия AutoCare Hub — 05.09.2026 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/GEO_SEARCH_STRATEGY.md](operations/GEO_SEARCH_STRATEGY.md) — Production geo-search strategy | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/GITHUB_ACTION_PINS.md](operations/GITHUB_ACTION_PINS.md) — GitHub Actions: immutable references | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/LEGACY_CLEANUP_EVIDENCE_2026-08-27.md](operations/LEGACY_CLEANUP_EVIDENCE_2026-08-27.md) — Legacy cleanup evidence — 2026-08-27 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/LOCAL_MOCK_SCENARIOS.md](operations/LOCAL_MOCK_SCENARIOS.md) — Local mock UI scenarios | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/LOCAL_PILOT_QUALITY_EVIDENCE_2026-08-25.md](operations/LOCAL_PILOT_QUALITY_EVIDENCE_2026-08-25.md) — Local pilot quality evidence — 2026-08-25 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/LOCAL_PRODUCTION_OPERATIONS_EVIDENCE_2026-08-27.md](operations/LOCAL_PRODUCTION_OPERATIONS_EVIDENCE_2026-08-27.md) — Local production operations evidence — 27 Aug 2026 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/MVP_MANUAL_ACCEPTANCE_CHECKLIST.md](operations/MVP_MANUAL_ACCEPTANCE_CHECKLIST.md) — AutoCare Hub — ручная приёмка локального MVP | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/MVP_PILOT_IMPROVEMENT_PLAN_2026-09-23.md](operations/MVP_PILOT_IMPROVEMENT_PLAN_2026-09-23.md) — MVP / pilot improvement plan — 2026-09-23 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/MVP_REMAINING_100_BLOCKS.md](operations/MVP_REMAINING_100_BLOCKS.md) — AutoCare Hub — оставшиеся MVP-блоки по 100 шагов | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/MVP_VERIFICATION_SLICE_2026-08-25.md](operations/MVP_VERIFICATION_SLICE_2026-08-25.md) — MVP verification slice — 25 Aug 2026 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/NEXT_INITIAL_JAVASCRIPT_BASELINE.md](operations/NEXT_INITIAL_JAVASCRIPT_BASELINE.md) — Production Next initial JavaScript baseline — 2026-10-04 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/NEXT_ROUTE_MATRIX_2026-08-25.md](operations/NEXT_ROUTE_MATRIX_2026-08-25.md) — Next.js route matrix | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PILOT_100_READINESS_PLAN.md](operations/PILOT_100_READINESS_PLAN.md) — AutoCare Hub — план готовности к пилоту 100% | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PILOT_AUTONOMOUS_100_EXECUTION.md](operations/PILOT_AUTONOMOUS_100_EXECUTION.md) — AutoCare Hub — автономное выполнение 100 пунктов | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PILOT_AUTONOMOUS_100_NEXT.md](operations/PILOT_AUTONOMOUS_100_NEXT.md) — AutoCare Hub — 100 следующих автономных шагов | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PILOT_AUTONOMOUS_200_EXECUTION.md](operations/PILOT_AUTONOMOUS_200_EXECUTION.md) — AutoCare Hub — единый 200-пунктовый аудит | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PILOT_EVIDENCE_TEMPLATE.md](operations/PILOT_EVIDENCE_TEMPLATE.md) — Real pilot evidence template | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PILOT_LOCAL_GATE_EVIDENCE_2026-08-31.md](operations/PILOT_LOCAL_GATE_EVIDENCE_2026-08-31.md) — Локальное evidence пилотного трека — 31.08.2026 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PILOT_READINESS_RUNBOOK.md](operations/PILOT_READINESS_RUNBOOK.md) — AutoCare Hub pilot readiness runbook | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PILOT_SCOPE_FREEZE.md](operations/PILOT_SCOPE_FREEZE.md) — AutoCare Hub — окончательный план готовности закрытого пилота | канонические 54 условия / GO-NO-GO | сверено частично | pilot checkers, release evidence и текущий NO-GO |
| [docs/operations/PILOT_TASK_ALLOCATION.md](operations/PILOT_TASK_ALLOCATION.md) — Распределение работ: срочность, ответственность и прогресс | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/POST_PILOT_LOCAL_EVIDENCE_2026-09-08.md](operations/POST_PILOT_LOCAL_EVIDENCE_2026-09-08.md) — AutoCare Hub — post-pilot backlog: локальное evidence | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PRODUCTION_OPERATIONS_PREFLIGHT.md](operations/PRODUCTION_OPERATIONS_PREFLIGHT.md) — Production operations preflight | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PUBLIC_PAGES_SEARCH_TRUST_RELEASE_GATE_2026-08-25.md](operations/PUBLIC_PAGES_SEARCH_TRUST_RELEASE_GATE_2026-08-25.md) — Public pages, discovery and trust release gate — 2026-08-25 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/PWA_RUNTIME_STATUS.md](operations/PWA_RUNTIME_STATUS.md) — PWA runtime status — 2026-10-04 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/RELEASE_EVIDENCE_TEMPLATE.md](operations/RELEASE_EVIDENCE_TEMPLATE.md) — Stable web release evidence template | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/REMAINING_BLOCKS_2026-08-23.md](operations/REMAINING_BLOCKS_2026-08-23.md) — Remaining roadmap blocks — 2026-08-23 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/RESOURCE_CAPACITY.md](operations/RESOURCE_CAPACITY.md) — Resource-level capacity policy | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/ROADMAP_STATUS_2026-08-23.md](operations/ROADMAP_STATUS_2026-08-23.md) — Roadmap status — blocks 2–8 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/SELF_EXECUTION_2026-09-08.md](operations/SELF_EXECUTION_2026-09-08.md) — Автономный проход AutoCare Hub — 8 сентября 2026 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/SEO_PRERENDER_MEDIA_EVIDENCE_2026-08-27.md](operations/SEO_PRERENDER_MEDIA_EVIDENCE_2026-08-27.md) — SEO, prerender and media budget evidence | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/STABLE_WEB_RELEASE_EVIDENCE.md](operations/STABLE_WEB_RELEASE_EVIDENCE.md) — Stable web release evidence | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/STAGING_API_EVIDENCE_TEMPLATE.md](operations/STAGING_API_EVIDENCE_TEMPLATE.md) — Staging API compatibility evidence | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/UI_LOADING_RESPONSIVE_A11Y_LOCALE_2026-08-25.md](operations/UI_LOADING_RESPONSIVE_A11Y_LOCALE_2026-08-25.md) — UI readiness audit — 25 August 2026 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/UI_RUNTIME_FIXES_2026-08-25.md](operations/UI_RUNTIME_FIXES_2026-08-25.md) — UI/runtime fixes — 2026-08-25 | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
| [docs/operations/autocare-discovery-release-gate.md](operations/autocare-discovery-release-gate.md) — AutoCare discovery and trust release gate | runbook / template / историческая приёмка; статус не сверён | не проверено | Связь с конкретной реализацией не сверена в этом проходе. |
