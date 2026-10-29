# Current finding disposition — 2026-10-04

**Локальный шаг 29.10, U03 admin reads:** личные данные и служебные очереди
в `admin.routes.ts` (пользователи, удаление, модерация, аудит, инциденты,
security center, outbox и обзоры), а также очередь отзывов платформы требуют
MFA не старше пяти минут до чтения. Публичная иерархия рынков сохраняет
role authorization без step-up. Backend build/targeted lint PASS; добавлена
negative PostgreSQL route matrix на 23 read paths, локально не запущена.
Другие модули и staging replay открыты; U03/pilot NO-GO не закрыты.

**Локальный шаг 29.10, U03 exceptional reads:** admin/super-admin чтение
жалоб на чат, приватного чата, вложения и подключение к chat WebSocket требуют MFA не старше
пяти минут до выдачи содержимого; live WebSocket authorization повторяет
проверку. Просмотр заявки super-admin тоже требует свежий фактор. Unit,
backend build и targeted lint PASS; негативный PostgreSQL integration case
добавлен, но локально не запускался. Blob attachment transport теперь сохраняет
JSON код отказа для общего step-up; frontend unit и Next build PASS.
Browser/staging replay не выполнялся.
Другие чувствительные чтения остаются открытыми; U03 и pilot NO-GO не закрыты.

**Локальный шаг 29.10, U03 integration fixtures:** устаревшие тестовые
admin/super-admin JWT без persisted session заменены явной фикстурой с
`mfaVerifiedAt`. Тесты реального login/MFA по-прежнему используют настоящий
путь входа. PostgreSQL integration suite локально не запускался.

**Локальный шаг 29.10, U03 recovery:** приватная команда сброса MFA требует
коды двух разных действующих super-admin, не совпадающих с владельцем фактора,
и ID обращения. В одной транзакции заменяет фактор и резервные коды, удаляет
сессии, повышает tokenVersion и пишет аудит. Внешняя проверка личности,
break-glass при отсутствии двух подтверждающих лиц и staging rehearsal открыты.

**Локальный шаг 29.10, U03 step-up:** проверка свежести MFA (5 минут) добавлена
для изменений пользователей, trust-policy, security-center, outbox и решений
об удалении аккаунта, а также экспорта аудита и отчёта безопасности.
Диалог получает новый код, `auth/step-up` обновляет только текущую сессию и
фиксирует успешное подтверждение в аудите; отказ фиксируется как security
event. Остальные sensitive actions, reset policy и staging acceptance открыты.

**Локальный шаг 29.10, U03 password MFA:** admin/super-admin password login
требует TOTP либо одноразовый recovery code. Секрет зашифрован и привязан к
user UUID, TOTP step и recovery code погашаются транзакционно; удаление
аккаунта очищает оба хранилища. Новые сессии
имеют `mfaVerifiedAt`, старые отвергаются. Подготовлены private terminal
provisioning и интеграционный replay test. Частичный step-up и recovery
описаны выше; staging-проверка ещё открыта.

**Локальный шаг 29.10, U03:** linked Google/Яндекс callback и начало
привязки OAuth запрещены для текущих admin/super-admin; callback не создаёт
сессию без подтверждённого второго фактора. Password login и одноразовые
recovery codes реализованы следующим локальным шагом; частичный reset и
step-up описаны выше. Staging-проверка ещё открыта, поэтому U03 остаётся открытым.

**Локальный шаг 28.10, автомобиль автопарка:** label/vehicleSnapshot получают HMAC по vehicle/fleet UUID. Migration 178680, bounded compare-write, полный verify и opt-in strict reader подготовлены; удаление владельца переподписывает оба обезличенных поля каждой строки. PostgreSQL CI, staging KMS/restore и strict cutover остаются открытыми.


**Локальный шаг 28.10, автопарк:** name/notes получают HMAC по fleet/owner UUID. Migration 178679, bounded compare-write, полный verify и opt-in strict reader подготовлены; удаление владельца переподписывает обезличенное название и очищает notes/binding. PostgreSQL CI, staging KMS/restore и strict cutover остаются открытыми.


**Локальный шаг 28.10, вопросы эксперту:** vehicleSnapshot/symptoms/answer получают HMAC по question/client UUID. Migration 178678, bounded compare-write, полный verify и opt-in strict reader подготовлены; удаление клиента переподписывает symptoms каждой строки и очищает snapshot/answer с bindings. PostgreSQL CI, staging KMS/restore и strict cutover остаются открытыми.


**Локальный шаг 28.10, гарантийное обращение:** summary/resolution получают HMAC по claim/request/client/provider UUID и claimType. Migration 178677, bounded compare-write, полный verify и opt-in strict reader подготовлены; удаление клиента переподписывает summary каждой строки и очищает resolution/binding. PostgreSQL CI, staging KMS/restore и strict cutover остаются открытыми.


**Локальный шаг 28.10, предложение по рассылке:** offerSnapshot получает HMAC по offer/broadcast/provider/location UUID. Migration 178676, bounded compare-write, полный verify и opt-in strict reader подготовлены; удаление клиента переподписывает redacted snapshot каждой строки. PostgreSQL CI, staging KMS/restore и strict cutover остаются открытыми.


**Локальный шаг 28.10, рассылка заявки:** issueDescription/vehicleSnapshot получают HMAC по broadcast/client/definition UUID. Migration 178675, bounded compare-write, полный verify и opt-in strict reader подготовлены; анонимизация переподписывает issue каждой строки и очищает snapshot/binding. PostgreSQL CI, staging KMS/restore и strict cutover остаются открытыми.


**Локальный шаг 28.10, журнал работ:** title/notes/metadata получают HMAC по event/request UUID и eventType. Migration 178674, bounded compare-write, полный verify и opt-in strict reader подготовлены; анонимизация переподписывает redacted title/metadata каждой строки и очищает notes/binding. PostgreSQL CI, staging KMS/restore и strict cutover остаются открытыми.


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
| Security 26 Sep, fields “not encrypted” | Versioned AES-GCM field envelopes/HMAC indexes are implemented. U05 stable index-key KEK rotation, U06 invitation transformer and U09 log redaction are published. U01 AWS KMS startup path is merged; user/invitation email read now checks the HMAC index. Local U02 provider change request, appeal and catalog gap bindings with bounded migrations 178671–178673 are prepared | U01 live KMS/IAM and restore acceptance; U02 remaining row/parent scope integrity, including paired index+ciphertext swaps; N09 production migration/retirement |
| Security 26 Sep, CBC backup/stream restore | Published U04 authenticates ACHBKP01 AES-GCM and stages complete gzip/SQL before consumer; negative tooling and CI PASS | External backup/key separation, live restore/RPO/RTO and historical archive decision |
| Security 26 Sep, private cache coverage | Published U10 applies path-normalized sensitive `private, no-store` barrier; CI HTTP assertions PASS | Production proxy/cache and client identity storage acceptance |
| Privileged MFA/step-up | Local TOTP or one-use recovery code is required for admin/super-admin password login; old sessions and linked OAuth are denied. A five-minute step-up protects user/trust/security/outbox/deletion mutations, audit/security CSV exports, private admin dashboard reads, chat reports/private chat reads and super-admin request detail. A two-super-admin reset command revokes sessions and audits the replacement. Migration 178681 and private-terminal provisioning are prepared | Staging privileged-login/recovery/step-up replay, external identity check and break-glass acceptance, other modules' sensitive reads, operational rollout; U03 remains open |
| Next PWA | N03 removes unsupported production claim; Vite PWA is compatibility-only | Separate Next install/offline/update/cache implementation and browser acceptance |

No report here claims there is no encryption or that server-side encryption hides
all data from a fully compromised authorized backend. Historical archives and
unrelated dirty files were neither edited nor committed; their hashes were
verified. Urgent baseline is main `a29b361`. The nonurgent packet's local results
and remaining N09/N11 scope are in the current working registry. Publication and
hosted acceptance are verified through the exact-candidate dev→main PR/Actions.
