# Локальное evidence пилотного трека — 31.08.2026

Этот файл фиксирует только проверяемую локально часть пилотного запуска. Он не
подменяет staging/production evidence и не позволяет засчитать demo-данные как
реальные SLA или пользовательский пилот.

## Пройдено

- `npm --prefix server run check:pilot-quality -- --json` — PASS: 4 активных
  провайдера, 23 активных предложения, 100% покрытия предложений и 100%
  покрытия цен.
- `REDIS_HOST=localhost REDIS_PORT=6379 REDIS_RATE_LIMIT_FAILURE_MODE=fail-open
  npm --prefix server run smoke:autocare-realtime` — PASS: два отдельных
  подписчика получили повторную доставку одного `eventId`.
- `npm --prefix server run test:unit` — PASS: 183 файла / 583 теста.
- `npm --prefix server run test:tooling` — PASS: 5/5 Docker/preflight tooling tests.
- `npm --prefix server run build` — PASS.
- `npm run test:ops-harness` — PASS: **14/14** repository operations tests,
  включая real-API health-preflight regression.
- `npm --prefix server run check:security` — PASS: 5/5 security controls.
- `npm --prefix server run test:integration` — PASS: 14 файлов / 60 тестов на
  PostgreSQL/Redis service-backed harness.
- Account deletion integration regression дополнительно проверяет, что
  user-provided reason очищается при `completed` и не возвращается после reload;
  в текущей среде service-backed запуск заблокирован PostgreSQL на `127.0.0.1:5433`,
  поэтому это не засчитано как новый runtime evidence.
- Новый retention regression также проверяет удаление pending/failed outbox
  событий и redaction payload завершённых/dead-letter событий; in-flight worker
  race требует staging rehearsal.
- Deletion invariant inventory дополнительно блокирует завершение, если
  outbox-событие с deleted `userId` осталось без `redacted` payload.
- Moderation rejection теперь удаляет provider cover/gallery object после commit;
  при storage failure решение сохраняется, а orphan cleanup повторяет удаление.
- Provider media output-policy теперь отбрасывает внешние и повреждённые ссылки из
  публичного mapper, а moderation queue принимает только application-generated
  cover/gallery uploads; bundled provider assets остаются разрешёнными demo
  build-артефактами. Проверены deduplication и namespace/path traversal cases.
- `node --test scripts/check-real-api.test.mjs` — PASS: 5/5 health-preflight
  regressions, включая безопасную обработку connection/status ошибок.
- `test:e2e:real` теперь выполняет preflight до `demo:reset`/seed и повторяет его
  перед Playwright; при недоступном API demo-данные не очищаются.
- Production Redis policy rehearsal с синтетическими непубликуемыми значениями — PASS: distributed limiter reachable, `fail-closed`.
- `npm run check:staging-api` — local API parity contract PASS; внешний URL не
  задан, поэтому network probe не выполнялся.

Последняя локальная порция: полный backend unit — **184 файла / 587 тестов**,
backend build, frontend lint и `git diff --check` PASS. Это repository-level
evidence; historical external media в production базе и private object-store
lifecycle всё ещё требуют staging rehearsal.

В следующей порции полный backend unit прошёл **184 файла / 589 тестов**.
Публичные review media очищаются от внешних ссылок, а broadcast photo input
принимает только opaque private references; private uploader и signed access
намеренно остаются staging blocker.

Дополнительный schema guard отклоняет traversal/пустые сегменты в private
references; targeted schema/policy tests прошли **11/11**, backend build PASS.

Private-reference policy теперь едина для owner documents, provider change
requests и moderation queue; malformed legacy references отбрасываются из
admin responses. Полный backend unit после этой порции — **184 файла / 590
тестов**, build и lint PASS.

Attachment output policy дополнительно проверена для chat/service-request
чтения: только `image/jpeg`, `image/png` и `image/webp` могут попасть в inline
ответ или signed URL; redirect получает `private, no-store`, а invalid legacy
content type скрывается как `404`. Полный backend unit после этой порции —
**184 файла / 591 тест**, backend build, frontend lint и `git diff --check`
PASS. S3 ACL, фактический signed response и cross-tenant replay остаются
staging evidence для `PILOT-03/SEC-01/SEC-02`.

Попытка повторить service-backed `provider-branch-access.integration.test.ts`
(8 тестов) остановлена до выполнения тестов: PostgreSQL `127.0.0.1:5433`
недоступен (`EPERM`). Результат не используется как PASS и не меняет
локальный процент.

Retention cleanup attachments дополнительно защищён от shared `objectKey`:
object store удаляется только при единственной ссылке; при нулевой ссылке
metadata удаляется, а orphan sweep получает grace period. Regression policy
прошёл, полный backend unit — **184 файла / 592 теста**, build, lint и
`git diff --check` PASS. Concurrent retention и restore остаются staging
проверками.

Attachment parent binding дополнительно проверяет, что `objectKey` относится к
тому же request/thread UUID, к которому у пользователя есть доступ; связанные
request keys разрешены только внутри его chat thread. Account deletion
учитывает глобальный reference count и не удаляет shared/foreign object.
Regression storage policy и полный backend unit — **184 файла / 593 теста**,
build, lint и `git diff --check` PASS. PostgreSQL HTTP replay и shared-key race
не запускались без локального PostgreSQL `127.0.0.1:5433`.

Data export больше не раскрывает внутренние private storage `objectKey`:
пользовательские метаданные attachment сохранены, а внутренний путь хранения
исключён из JSON. Regression export privacy и полный backend unit — **184 файла /
594 теста**, build, lint и `git diff --check` PASS. Фактический
export/deletion/restore rehearsal остаётся внешним `SEC-03/SEC-07` gate.

PostgreSQL attachment integrity дополнительно закреплена миграцией
`1786280000000-HardenAutoCareAttachmentIntegrity`: новые rows получают
write-time checks для MIME allow-list, opaque object-key и соответствия
`requestId`/`threadId` namespace. TypeORM entity и schema-contract policy
синхронизированы, migration regression прошёл **2/2**, полный backend unit —
**185 файлов / 596 тестов**, migration-order check и backend build PASS.
Constraints намеренно `NOT VALID`, поэтому применение,
backfill/`VALIDATE CONSTRAINT` legacy rows и service-backed replay остаются
staging database gate и не выдаются за активное локальное runtime evidence.

Upload runtime guard дополнительно проверяет MIME allow-list до decode и
normalization: прямой вызов сервиса с `text/html` больше не может попасть в
magic-byte fallback или metadata row. Regression attachment tests прошли
**12/12**, полный backend unit — **185 файлов / 597 тестов**, backend build,
frontend lint и `git diff --check` PASS. PostgreSQL/S3/AV runtime evidence
остаётся staging gate.

Attachment read integrity дополнительно усилена SHA-256 сверкой: filesystem
bytes сравниваются с checksum из БД, а перед S3 signed URL выполняется
`HeadObject`-проверка приватной `sha256` metadata. Несовпадение или malformed
checksum возвращается как `404` без раскрытия причины. Storage regression
прошёл **12/12**; полный backend unit — **185 файлов / 599 тестов**, backend
build, frontend lint и `git diff --check` PASS. Реальный S3 GET/race rehearsal
остаётся staging gate.

Проверка media integrity дополнена сверкой фактической длины объекта с `bytes`
из БД: filesystem bytes и S3 `ContentLength` должны совпадать; значение размера
из object store не используется для неконтролируемой аллокации памяти. Storage
regression прошёл **13/13**, полный backend unit — **185 файлов / 600 тестов**,
backend build, frontend lint и `git diff --check` PASS. Mutation после
`HeadObject` и concurrent read race остаются staging object-store gate.

S3 preflight исправлен для legacy rows: `HeadObject` выполняется при наличии
либо checksum, либо `bytes`; bytes-only запись больше не получает signed URL
без проверки `ContentLength`. Regression storage прошёл **14/14**, полный
backend unit — **185 файлов / 601 тест**, backend build, frontend lint и
`git diff --check` PASS. Race после HEAD и фактический S3 GET остаются
внешним staging gate.

Retention cleanup дополнительно проверяет parent scope перед удалением объекта:
foreign или malformed `objectKey` больше не может удалить чужой object store
object, а metadata row очищается безопасно отдельно. Regression storage прошёл
**15/15**, полный backend unit — **185 файлов / 602 теста**, backend build,
frontend lint и `git diff --check` PASS. Concurrent retention и restore остаются
staging gates.

Перед выдачей S3 signed URL дополнительно проверяются storage metadata:
`state=quarantine` отклоняется, а сохранённый `Content-Type` должен совпадать с
безопасным MIME из БД. Regression storage прошёл **16/16**, полный backend unit
— **185 файлов / 603 теста**, backend build, frontend lint и `git diff --check`
PASS. Legacy object без optional metadata сохраняется совместимым; ACL и race
после HEAD требуют staging.

DB-level checksum contract закреплён миграцией
`1786290000000-HardenAutoCareAttachmentChecksum`: checksum допускается только
как `NULL` для legacy либо как 64 hex-символа SHA-256. Entity и
schema-contract policy синхронизированы, migration regression прошёл **2/2**,
полный backend unit — **186 файлов / 605 тестов**, migration-order check,
backend build, frontend lint и `git diff --check` PASS. Применение и
backfill/validation legacy rows остаются staging PostgreSQL gate.

Низкоуровневый storage helper теперь принимает только image MIME allow-list и
передаёт в S3 нормализованный content type; `application/octet-stream` и
произвольные значения отклоняются до filesystem/S3 side effect. Storage
regression прошёл **17/17**, полный backend unit — **186 файлов / 606 тестов**,
backend build, frontend lint и `git diff --check` PASS. Реальный AV/S3 ACL
pipeline остаётся staging gate.

Локальное чтение attachment теперь открывает файл с `O_NOFOLLOW` и проверяет
размер уже открытого inode; symlink-подмена между предварительной проверкой и
чтением не может направить bytes во внешний путь. Ошибки `ENOENT`, `ELOOP` и
`ENOTDIR` скрываются как `404`, file handle закрывается гарантированно, а
существующий symlink regression и полный backend unit прошли (**186 файлов /
606 тестов**), backend build, frontend lint и `git diff --check` PASS. Это не
заменяет staging-проверку атомарности S3 GET, bucket policy и object-store race.

Provider cover/gallery media защищены тем же boundary: чтение и streaming
открывают файл с `O_NOFOLLOW`, проверяют размер уже открытого inode и
гарантированно закрывают descriptor после выдачи. `ENOENT`, `ELOOP` и `ENOTDIR`
не раскрывают файловую систему и возвращают `404`; symlink и oversized media
regressions прошли, полный backend unit — **186 файлов / 606 тестов**, backend
build, frontend lint и `git diff --check` PASS. Production S3/private media,
AV quarantine и bucket policy остаются staging gates.

Provider media orphan cleanup дополнительно использует `lstat`: symlink,
directory и oversized entry не становятся кандидатами retention, поэтому
cleanup не следует по symlink к внешнему target. Regression с orphan-файлом и
symlink прошёл (**5/5**), полный backend unit — **186 файлов / 607 тестов**,
backend build, frontend lint и `git diff --check` PASS. Реальный object-store
retention, concurrent cleanup и backup/restore требуют staging rehearsal.

Provider media cover/gallery теперь проверяют media root до записи, чтения,
streaming и удаления; symlink либо не-директория блокируются. Перед созданием
нового каталога выполняется boundary check, поэтому подменённый root не получает
даже временный upload. Regression с symlink root прошёл (**6/6**), полный
backend unit — **186 файлов / 608 тестов**, backend build, frontend lint и
`git diff --check` PASS. Private S3 policy, signed access, AV quarantine и
production storage rehearsal остаются внешними gates.

Provider logo storage получил тот же root boundary и TOCTOU guard: чтение
открывает файл с `O_NOFOLLOW`, streaming использует проверенный descriptor, а
symlink root блокируется до записи. Logo orphan cleanup использует `lstat` и
пропускает symlink, directory и oversized entry. Regressions прошли (**5/5**),
полный backend unit — **186 файлов / 610 тестов**, backend build, frontend lint и
`git diff --check` PASS. Production logo bucket policy, AV quarantine и
backup/restore остаются staging gates.

Filesystem cabinet image storage получил root boundary: symlink либо
не-директория блокируются перед `put`, `remove`, `list` и streaming. Cabinet
image stream открывает объект через `O_NOFOLLOW` и проверяет размер открытого
inode, поэтому symlink/TOCTOU-подмена не выдаёт bytes. Regression на symlink
storage root и полный backend unit прошли (**186 файлов / 611 тестов**), backend
build, frontend lint и `git diff --check` PASS. Production media migration,
private object storage, bucket policy и backup/restore остаются staging gates.

Для `autocare_service_attachments.objectKey` добавлен non-unique индекс
`IDX_autocare_attachments_object_key`: reference-count проверки retention и
account deletion получают предсказуемый lookup, shared legacy rows остаются
разрешёнными. Миграция `1786300000000-AddAutoCareAttachmentObjectKeyIndex`,
entity и schema-contract policy синхронизированы; migration regression прошёл
**2/2**, полный backend unit — **187 файлов / 613 тестов**, backend build,
frontend lint и `git diff --check` PASS. Применение индекса и production-like
query plan требуют staging PostgreSQL.

Низкоуровневый `FileSystemCabinetImageStorage.put` теперь проверяет фактический
размер `Buffer` до root/mkdir/temp-file side effect: пустой объект получает
`CABINET_IMAGE_INVALID_CONTENT`, а объект больше `MAX_CABINET_IMAGE_BYTES` —
`CABINET_IMAGE_TOO_LARGE`. Добавлен regression на оба случая и отсутствие
файлового side effect; cabinet storage tests прошли **7/7**, полный backend unit
— **187 файлов / 614 тестов**, backend build, frontend lint и `git diff --check`
PASS. MIME/magic-byte/decode остаются upload/service guard-ами, а private
production object storage, AV quarantine и backup/restore требуют staging
evidence.

Filesystem private attachments дополнительно защищены от symlink-root при
записи: путь root/scope/parent создаётся по одному уровню, каждый уровень
проверяется через `lstat`, а root вычисляется из актуального
`CABINET_UPLOADS_DIR`. Regression с подменённым root подтвердил отсутствие
записи во внешний каталог; attachment storage tests прошли **18/18**, полный
backend unit — **187 файлов / 615 тестов**, backend build, frontend lint и
`git diff --check` PASS. Race при замене каталога между проверками требует
отдельного staging threat review; private S3/AV и backup/restore остаются
внешними gates.

S3 signed-download preflight теперь выполняется всегда, в том числе для
legacy rows без checksum/bytes: `HeadObject` проверяет безопасный `ContentLength`,
`state=private` и допустимый MIME, поэтому empty/oversized/quarantine или
несовместимый объект не получает signed URL. Pure regression для legacy и
unsafe metadata прошёл **19/19**, полный backend unit — **187 файлов / 616
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальные
bucket permissions, HEAD→GET race и staging security review остаются внешними
gates.

Private attachment reads дополнительно отклоняют пустой объект независимо от
наличия DB metadata: filesystem inode/content, S3 `ContentLength`, streamed
body и `transformToByteArray` проходят единый `1..10 MB` safe-integer guard.
Regression расширен для пустого filesystem объекта, `ContentLength=0`, NaN и
границ; attachment storage tests прошли **19/19**, полный backend unit —
**187 файлов / 616 тестов**, backend build, frontend lint и `git diff --check`
PASS. Реальный S3 HEAD→GET race и bucket policy остаются staging gates.

Public provider cover/gallery, provider logo и legacy cabinet image streams
теперь отклоняют пустые файлы по уже открытому inode; для `Buffer` дополнительно
проверяется фактическая длина содержимого. Regression расширен для всех трёх
storage suites и прошёл **18/18**, полный backend unit — **187 файлов / 616
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальные
CDN/S3 policies, quarantine и production retention остаются внешними
`SEC-02/SEC-03` gates.

Provider media и logo filename parsing теперь ограничены 128 символами во всех
ветках: assertion, URL namespace и orphan cleanup. Чрезмерно длинный путь не
доходит до файловых операций; regressions provider media/logo прошли **11/11**,
полный backend unit — **187 файлов / 616 тестов**, backend build, frontend lint
и `git diff --check` PASS. WAF/proxy limits и staging threat review остаются
внешними `SEC-02/SEC-06` gates.

Account-deletion outbox invariant теперь сверяет все идентификаторы, которые
использует redaction-операция: `userId`, исходные `email` и `toEmail`. Сервис
передаёт оригинальный email до анонимизации пользователя, а offline retention
проверка безопасно передаёт `NULL`, когда исторический адрес недоступен. Added
regressions на SQL и параметры прошли **2/2**; полный backend unit — **187
файлов / 617 тестов**, backend build, frontend lint и `git diff --check` PASS.
Для уже завершённых удалений без сохранённого исходного email требуется
staging retention evidence; это не считается закрытием production backup/restore
или независимого security review.

Outbox redaction и deletion invariant дополнительно нормализуют email через
`LOWER(TRIM(...))`, поэтому payload с регистром или пробелами вокруг адреса не
обходит privacy cleanup. Integration fixture расширен таким payload, а
invariant regression подтверждает нормализованное SQL-сопоставление. Полный
backend unit прошёл **187 файлов / 617 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальная service-backed deletion/retention rehearsal
по-прежнему требует PostgreSQL/staging и не подменяется локальным контрактом.

Provider profile change requests теперь проходят единый строгий policy перед
сохранением: bounded строки и числа, email/URL, максимум коллекций, dedupe
телефонов/amenities/брендов и только opaque private document references с
валидной датой. Regression suite прошёл **9/9**; полный backend unit — **188
файлов / 626 тестов**, backend build, frontend lint и `git diff --check` PASS.
Staging owner/admin replay, private document storage и signed moderation access
остаются внешним gate.

Appeals получили PostgreSQL partial unique index
`UQ_autocare_appeals_pending_subject` по `submittedById`, `subject` и `subjectId`
для `status = 'pending'`. Это не позволяет двум параллельным запросам создать
два unresolved appeal; сервис на уникальном конфликте `23505` возвращает
pending-строку, выигравшую гонку, и не маскирует другие ошибки сохранения.
Entity, schema-contract inventory и migration
`1786310000000-AddAutoCareAppealPendingUniqueIndex` синхронизированы; policy и
migration regressions прошли **10/10**, полный backend unit — **189 файлов /
629 тестов**, backend build, frontend lint и `git diff --check` PASS. До
staging/production применения нужно проверить и разрешить исторические
pending-дубли; multi-process PostgreSQL rehearsal и независимый security review
остаются внешними gates.

Для appeals service добавлен отдельный runtime boundary gate: malformed
create/subject/evidence references и withdrawal UUID отклоняются до
repository/transaction access. Admin appeal list, decision и pending-count
paths повторно подтверждают bounded query/decision input и admin
authorization; обычный client получает `403` до чтения БД. Добавлены appeal
service-boundary regressions **5/5**, полный backend unit — **263 файла / 914
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный
appeal HTTP replay, evidence viewer, moderation queue, notification delivery и
staging retention остаются внешними gates.

Для chat service добавлен отдельный runtime boundary gate: malformed
chat/request/attachment/block identifiers и message/report/block/attachment
payloads отклоняются до repository lookup или transaction. Admin chat-report
list и decision paths сохраняют authorization-first порядок: обычный client
получает `403`, admin с malformed status/id — контролируемый `422`; provider,
support и admin-escalation creation guards также проверены. Добавлены chat
service-boundary regressions **5/5**, полный backend unit — **264 файла / 919
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный chat
HTTP replay, multi-process reconnect, private media/AV, moderation queue и
staging WebSocket evidence остаются внешними gates.

Для bonus service добавлен отдельный runtime boundary gate: программы
владельца, liability, redemption и manual grant повторно проверяют
provider/client/request UUID и payload до repository/transaction access.
Ролевые ограничения подтверждены до чтения и записи: только client видит и
списывает бонусы, только owner управляет программой и выдачей; обязательный
idempotency key для manual grant сохранён. Добавлены bonus service-boundary
regressions **5/5**, полный backend unit — **265 файлов / 924 теста**, backend
build, frontend lint и `git diff --check` PASS. Реальный bonus lifecycle
replay, concurrent redemption/grant, deletion retention и staging pilot
evidence остаются внешними gates.

Appeal migration дополнительно выполняет bounded duplicate-preflight до DDL:
pending-строки группируются по `submittedById`, `subject`, `subjectId`, а
невалидный результат или существующая duplicate-группа останавливают rollout с
понятной ошибкой reconciliation. Regressions на чистый preflight, duplicate и
invalid count прошли **4/4**; полный backend unit — **189 файлов / 631 тест**,
backend build, frontend lint и `git diff --check` PASS. Фактическая очистка
исторических дублей в staging/production остаётся операторским gate.

Пользовательский data export теперь включает appeals, отправленные текущим
пользователем: subject, subjectId, providerId, reason, evidence references,
status и даты решения. `decidedById` намеренно не экспортируется, чтобы не
раскрывать внутренний идентификатор модератора; private attachment `objectKey`
также остаётся исключённым. Service, OpenAPI и mock-ответ синхронизированы;
serializer/openapi regressions прошли **4/4**, backend build, frontend lint и
`git diff --check` PASS. PostgreSQL replay с реальными appeal rows и ручная
проверка архива остаются staging/privacy gate.

Guarantee claim evidence теперь ограничена opaque private-media namespace
`private://autocare/claims/...`: public HTTPS URLs, traversal и чужие namespaces
отклоняются schema boundary. Mock API и OpenAPI contract используют тот же
bounded pattern и максимум 20 ссылок. Schema/OpenAPI regressions прошли **13/13**,
полный backend unit — **189 файлов / 633 теста**, backend build, frontend lint и
`git diff --check` PASS. Private S3/AV/signed-access replay остаётся внешним
`PILOT-03/SEC-02` gate.

Guarantee claim service теперь повторно валидирует evidence references
непосредственно перед записью, поэтому вызов минуя HTTP schema не сохраняет
public URL, traversal или non-string. Нормализатор trim-ит безопасные claims
references и ограничивает их 20 элементами; invalid input даёт `422
VALIDATION_ERROR`. Private-reference policy suite прошёл **2/2**; полный backend
unit — **190 файлов / 635 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальный private S3/AV/signed-access replay остаётся
staging gate.

Broadcast request service теперь повторно валидирует `photoUrls` непосредственно
перед записью, поэтому вызов минуя HTTP schema не сохраняет public URL, traversal
или non-string. Нормализатор принимает только `requests`/`broadcasts` private
namespaces, trim-ит ссылки и ограничивает их 12 элементами; invalid input даёт
`422 VALIDATION_ERROR`. Private-reference policy suite расширен до **3/3**;
полный backend unit — **190 файлов / 636 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальный private S3/AV/signed-access replay broadcast
photos остаётся staging gate.

Очередь moderation-evidence для документов владельца теперь повторно нормализует
вход непосредственно перед сохранением: не-объект, пустой/слишком длинный label,
public reference, переполнение коллекции и невалидная дата не проходят. Для
строковых дат требуется timezone offset; label/reference trim-ятся, максимум
20 документов проверяется без молчаливого усечения, invalid input даёт `422
VALIDATION_ERROR` вместо `500`. Создание provider использует тот же нормализатор;
private-reference policy suite расширен до **4/4**, полный backend unit — **190
файлов / 637 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальная private storage/AV/quarantine/signed moderator access проверка
остаётся staging gate.

Создание профиля автосервиса теперь строго нормализует `logoUrl`,
`coverImageUrl` и `galleryImageUrls` перед записью. Внешние, protocol-relative,
static/traversal и non-string references отклоняются; gallery ограничена 12
элементами, ссылки trim-ятся и deduplicate-ятся, invalid input даёт `422
VALIDATION_ERROR`. Strict write-boundary regression прошёл; public-media suite
расширен до **5/5**, полный backend unit — **190 файлов / 638 тестов**, backend
build, frontend lint и `git diff --check` PASS. Реальная загрузка, AV/quarantine,
private ACL и moderation replay остаются staging gates.

Review service теперь повторно нормализует рейтинг и текст непосредственно перед
записью в `createAutoCareReview` и `updateClientAutoCareReview`. Прямой вызов не
сохраняет NaN, дробный или вне диапазона рейтинг, короткий/non-string текст;
текст приводится к NFKC и trim-ится без потери регистра. Ограничения совпадают с
schema: рейтинг 1–5 и текст 10–1000 символов; invalid input даёт `422
VALIDATION_ERROR`. Review-integrity suite расширен до **5/5**, полный backend
unit — **190 файлов / 639 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальный staging submission/moderation, review media и
multi-client replay остаются внешними gates.

Сообщения service-request и generic chat теперь нормализуют тело на сервисной
границе: NFKC, trim и длина 1–4000 символов. Пустые, non-string и oversized
значения отклоняются как `422 VALIDATION_ERROR`. Для service-request сообщений
idempotency key повторно проверяется тем же safe-контрактом 8–128 символов
`[A-Za-z0-9_-]`, а fingerprint строится по нормализованному тексту. Добавлены
message-content и direct-idempotency regressions; полный backend unit — **191
файл / 642 теста**, backend build, frontend lint и `git diff --check` PASS.
Multi-process Redis/WebSocket delivery, reconnect/retry и chat moderation
остаются внешними staging gates.

Offer payload на сервисной границе теперь нормализуется повторно, поэтому
прямой вызов `createAutoCareServiceOffer` не может записать malformed type/title,
скидку вне диапазона, невалидный купон, непарные amount/currency или неверный
expiry. Title/description trim-ятся и приводятся к NFKC, coupon/currency
канонизируются в uppercase, а alternative offer не сохраняет discount/coupon
поля. Нормализованный title используется также в message body, repair event и
notification. Новый offer-policy suite прошёл **3/3**, полный backend unit —
**192 файла / 645 тестов**, backend build, frontend lint и `git diff --check`
PASS. Реальный PostgreSQL lock/replay и multi-process staging concurrency
остаются внешними gates; платежные системы в пилот не включаются.

Quote payload на сервисной границе теперь нормализуется повторно перед
транзакцией. Сумма и валюта проверяются и канонизируются, note trim-ится,
налоги/комиссии получают безопасные defaults, а `priceLocked` принимает только
boolean. Line items ограничены 100 элементами, проверяют kind/title/quantity и
целый unit price до арифметики; `totalMinor` вычисляется только из безопасных
чисел. Невалидные значения возвращают `422 VALIDATION_ERROR`, а прошлый
конфликт отрицательных non-discount line items и проверка равенства totals
сохранены. Новый quote-input suite прошёл **4/4**, полный backend unit — **193
файла / 649 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный PostgreSQL lock/replay и multi-process staging concurrency остаются
внешними gates; платежные системы в пилот не включаются.

Запрос и решение по переносу визита теперь повторно нормализуют данные на
сервисной границе. `proposedAt` принимается только как offset-aware datetime,
причина приводится к NFKC/trim и ограничена 1 000 символами, а невалидные
значения дают `422 VALIDATION_ERROR` до открытия транзакции. Для даты в прошлом
сохранён отдельный бизнес-конфликт `409`; при принятии/отклонении reason
проверяется до записи `resolutionReason` и audit event. Новый reschedule-input
suite прошёл **3/3**, полный backend unit — **194 файла / 652 теста**, backend
build, frontend lint и `git diff --check` PASS. Реальный multi-process race и
staging capacity replay остаются внешними gates.

Причины отмены, no-show и завершения визита теперь проходят единый нормализатор
до транзакции. Он принимает только строку длиной до 1 000 символов, приводит её
к NFKC/trim и сохраняет пустое значение как `null`; malformed значения дают
`422 VALIDATION_ERROR` вместо `TypeError` или записи мусора. Тот же контракт
используется для `resolutionReason` при решении reschedule, поэтому request,
repair event и audit flow получают канонический текст. Reschedule-input suite
прошёл **3/3**, полный backend unit — **194 файла / 652 теста**, backend build,
frontend lint и `git diff --check` PASS. Реальный PostgreSQL transition matrix и
multi-process race остаются внешними gates.

Создание service request теперь повторно нормализует весь payload на сервисной
границе до provider lookup и JSONB persistence. UUID приводятся к lowercase,
`preferredAt` принимается только как offset-aware datetime и канонизируется в UTC
ISO, contact/vehicle snapshots проверяют allow-list, типы, длины и NFKC/trim,
заметка ограничена 4 000 символами, а idempotency key использует общий safe-
контракт. Поэтому прямой внутренний вызов не может обойти HTTP schema и сохранить
повреждённые идентификаторы, даты или PII snapshot. Request-input regression suite
прошёл **4/4**, полный backend unit — **195 файлов / 656 тестов**, backend build,
frontend lint и `git diff --check` PASS. Partial contact snapshots допускаются
только для существующих внутренних fixtures; HTTP route требует полный contact
payload. Реальный PostgreSQL idempotency/concurrency replay и внешняя доставка
контактов остаются staging gates.

Appeal create boundary теперь проверяет subject и subject references до lookup,
приводит UUID к lowercase, нормализует reason через NFKC/trim и принимает не
более 20 уникальных валидных evidence UUID; malformed payload возвращает `422
VALIDATION_ERROR`, а не `.trim()`/DB exception. Admin decision boundary также
проверяет статус `accepted/rejected` и bounded decision reason до транзакции.
Добавлены regressions для malformed references, overflow и decision payload;
appeal policy suite прошёл **4/4**, полный backend unit — **195 файлов / 657
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный appeal
HTTP/PostgreSQL lifecycle, ownership replay и multi-process moderation race
остаются staging gates.

Chat moderation mutations теперь повторно нормализуют payload на сервисной
границе. Report category проверяется по enum, description проходит NFKC/trim и
bounded limit 2 000 символов; block target обязан быть canonical UUID, reason
ограничена 1 000 символами. Admin decision принимает только `resolved` или
`dismissed`, bounded reason и boolean `blockUser`. Malformed direct-call payload
возвращает `422 VALIDATION_ERROR` до lookup/save, а не падает на `.trim()` или
TypeORM. Добавлен chat-moderation policy suite **5/5**, полный backend unit —
**196 файлов / 662 теста**, backend build, frontend lint и `git diff --check`
PASS. Multi-process moderation/reconnect, private media quarantine и staging
queue replay остаются внешними gates.

Создание chat thread теперь повторно нормализует type, subject и optional
provider/request UUID перед provider lookup и persistence. Subject приводится к
NFKC/trim, ограничен 2–160 символами и отклоняет управляющие code points;
идентификаторы проверяются как canonical RFC UUID. Некорректный direct-call
payload возвращает `422 VALIDATION_ERROR`, не изменяя role, provider status и
chat-enabled проверки. Chat-input policy suite прошёл **4/4**, полный backend
unit — **197 файлов / 666 тестов**, backend build, frontend lint и `git diff
--check` PASS. Optional requestId пока сохраняет прежнюю семантику (поле
принимается контрактом, но не меняет текущую ветку создания); его полноценная
thread-привязка и multi-process replay остаются отдельными staging/contract
задачами.

Upload envelope для service-request и chat attachments теперь повторно проверяет
fileName, MIME, размер и base64 до декодирования и записи object key. File name
нормализуется через NFKC/trim, ограничен 255 символами и не принимает
управляющие code points; `decodeAutoCareAttachment` также безопасно обрабатывает
`null`/malformed runtime input через `422 VALIDATION_ERROR`. Добавлен regression
для полного upload envelope, полный backend unit — **197 файлов / 667 тестов**,
backend build, frontend lint и `git diff --check` PASS. Private S3 ACL,
ClamAV/quarantine, signed delivery и production storage rehearsal остаются
внешними staging gates.

Client vehicle create/update теперь повторно нормализуют payload до записи в
PostgreSQL. Unknown keys, malformed years/numbers, unsupported fuel types и
некорректный VIN отбрасываются как `422 VALIDATION_ERROR`; текстовые поля
проходят NFKC/trim, `brandId` канонизируется в lowercase, VIN сохраняется
uppercase, а пустые plate/internal number становятся `null`. Добавлен
client-vehicle policy suite **4/4**, полный backend unit — **198 файлов / 671
тест**, backend build, frontend lint и `git diff --check` PASS. Реальная vehicle
persistence в request snapshot, удаление автомобиля и staging client-path
replay остаются внешними gates; fleet scope не расширялся.

Favorites create/remove/sync теперь повторно проверяют идентификаторы кабинетов
на сервисной границе. UUID trim-ятся и канонизируются в lowercase до
lookup/upsert/delete; sync отклоняет non-array, malformed IDs и payload свыше
100 элементов через `422 VALIDATION_ERROR`, сохраняя дедупликацию и порядок.
Favorites policy suite прошёл **3/3**, полный backend unit — **199 файлов / 674
теста**, backend build, frontend lint и `git diff --check` PASS. Реальный
PostgreSQL favorite replay и multi-device concurrency остаются внешними
client-path/staging checks.

Обновление пользовательских preferences теперь повторно нормализует partial
payload до notification mutation и `UserEntity.save`. Boolean-переключатели,
supported locale, city и categories проверяются сервисным policy; строки
нормализуются, collections ограничиваются, неизвестные ключи и malformed
runtime values возвращают `422 VALIDATION_ERROR`. Preference policy suite прошёл
**4/4**, полный backend unit — **200 файлов / 678 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный PostgreSQL notification replay и
consent/retention evidence остаются внешним staging gate.

Admin moderation evidence decision теперь повторно нормализует `status` и
`reason` непосредственно перед транзакцией. Статус ограничен `approved` или
`rejected`, причина проходит NFKC/trim и bounded-ограничение 1–2 000 символов,
а неизвестные поля, non-string и oversized значения возвращают стабильный `422
VALIDATION_ERROR` до блокировки evidence и изменения provider/review. Добавлены
регрессии для Unicode-нормализации, malformed payload и границ длины;
moderation-evidence policy suite прошёл **6/6**, полный backend unit — **201
файл / 684 теста**, backend build, frontend lint и `git diff --check` PASS.
Полноценный evidence viewer, private media access, AV/quarantine и staging
moderation replay остаются внешними gates.

Admin appeal list теперь повторно нормализует query на сервисной границе до
запроса к PostgreSQL. Статусы и subjects проверяются по enum, `limit` ограничен
целым диапазоном 1–100 с default 50, неизвестные ключи и malformed runtime
values возвращают `422 VALIDATION_ERROR`; bounded `cursor` принят для текущего
route-контракта, но array response и прежняя семантика списка не изменены.
Withdraw и admin decision также канонизируют `appealId` как UUID до блокировки
строки и возвращают `422` для malformed identifier.
Добавлены regressions для валидного query, default и overflow/type/enum bypass;
appeal policy suite прошёл **5/5**, полный backend unit — **201 файл / 685
тестов**, backend build, frontend lint и `git diff --check` PASS. Полноценная
cursor pagination и staging HTTP replay остаются внешними задачами.

Admin moderation evidence queue теперь повторно нормализует status filter до
запроса к PostgreSQL. Принимаются только `pending`, `approved` и `rejected`;
значение приводится через NFKC/trim/lowercase, а unknown, legacy `verified`,
non-string и malformed values возвращают `422 VALIDATION_ERROR`. Лимит 100 и
текущий response contract не менялись. Добавлена regression для canonical
status и отказа неподдерживаемых значений; moderation-evidence policy suite
прошёл **7/7**, полный backend unit — **201 файл / 686 тестов**, backend build,
frontend lint и `git diff --check` PASS. Полноценная queue UI, evidence viewer,
private media access и staging replay остаются внешними gates.

Идентификаторы moderation evidence теперь проходят единую UUID-нормализацию до
запросов к PostgreSQL: `evidenceId` в admin decision и `providerId` в owner
evidence list trim-ятся и приводятся к lowercase, malformed values возвращают
`422 VALIDATION_ERROR` до lock/ownership lookup. Добавлена regression для
canonical UUID и отказа невалидных runtime значений; moderation-evidence policy
suite прошёл **8/8**, полный backend unit — **201 файл / 687 тестов**, backend
build, frontend lint и `git diff --check` PASS. HTTP ownership replay, private
media ACL и staging moderation остаются внешними gates.

Admin provider change request queue теперь повторно нормализует status/kind
filters до чтения PostgreSQL: enum значения приводятся к NFKC/trim/lowercase,
unknown значения отклоняются. Admin decision канонизирует request UUID и
статус `approved/rejected`, nullable reason нормализуется с лимитом 2 000
символов, malformed direct calls получают `422 VALIDATION_ERROR` до lock и
provider mutation. Policy suite прошёл **11/11**, полный backend unit — **201
файл / 689 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный admin/provider replay, lock race и private document moderation
остаются внешними gates.

Catalog-gap admin queue теперь повторно нормализует status filter до чтения
PostgreSQL, а admin decision канонизирует request UUID и статус
`approved/rejected`. Reason проходит NFKC/trim и лимит 2 000 символов; для
rejection обязательна непустая причина. Unknown, malformed и невалидные
идентификаторы получают `422 VALIDATION_ERROR` до lock или catalog mutation.
Добавлен catalog-gap policy suite **4/4**, полный backend unit — **202 файла /
693 теста**, backend build, frontend lint и `git diff --check` PASS. Реальный
catalog-gap replay, slug uniqueness race и admin audit/evidence остаются
внешними gates.

Admin service-definition update теперь повторно нормализует category, localized
labels, price type, comparison attributes и active flag до записи. Definition
UUID канонизируется до lookup; labels и attributes проходят NFKC/trim и
bounded-лимиты, неизвестные поля, malformed types и normalized label collisions
возвращают `422 VALIDATION_ERROR`, а дубликаты attributes дедуплицируются без
усечения. Catalog-gap policy suite прошёл **6/6**, полный backend unit — **202
файла / 695 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный admin catalog replay, slug uniqueness/concurrency и audit evidence
остаются внешними gates.

Создание catalog-gap request теперь повторно нормализует полный payload до
permission lookup и записи: provider UUID, proposed slug, category, labels,
price type, comparison attributes и rationale получают канонические типы и
bounded-лимиты. Unknown fields, malformed identifiers, invalid slug/locale/price
values и oversized collections/reason возвращают `422 VALIDATION_ERROR`;
attributes дедуплицируются без усечения, provider permission проверяется по
canonical UUID. Catalog-gap policy suite прошёл **8/8**, полный backend unit —
**202 файла / 697 тестов**, backend build, frontend lint и `git diff --check`
PASS. Реальный HTTP/PostgreSQL replay, duplicate pending race и slug uniqueness
под конкуренцией остаются внешними gates.

Admin chat reports queue теперь повторно нормализует status filter до чтения
PostgreSQL: принимаются только `pending`, `resolved`, `dismissed`, значения
канонизируются через NFKC/trim/lowercase. Admin report decision дополнительно
канонизирует `reportId` как UUID до lookup; malformed identifier возвращает
`422 VALIDATION_ERROR` до moderation mutation. Chat-moderation policy suite
прошёл **6/6**, полный backend unit — **202 файла / 698 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный queue/reconnect replay,
private attachments и multi-process race остаются внешними gates.

Chat thread lookup теперь канонизирует `chatId` до access check; revoke block
проверяет `chatId` и `blockId` до запроса и изменения статуса. Chat attachment
lookup и request-thread lookup получили тот же UUID-boundary, поэтому malformed
direct calls возвращают `422 VALIDATION_ERROR` до чтения private object или
сообщения. Chat-input policy suite прошёл **5/5**, полный backend unit — **202
файла / 699 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный chat authorization replay, private attachment ACL, signed delivery и
multi-process reconnect остаются внешними gates.

Owner provider change request теперь повторно нормализует provider UUID, request
kind и profile payload до permission lookup и duplicate check; verification
request не принимает профильные поля. Owner list/cancel paths канонизируют
provider/request UUID, а malformed envelope, неизвестные поля и unsafe profile
values возвращают `422 VALIDATION_ERROR` до PostgreSQL. Provider change request
policy suite прошёл **13/13**, полный backend unit — **202 файла / 701 тест**,
backend build, frontend lint и `git diff --check` PASS. Реальный owner/admin
workflow, multi-owner race и private document moderation остаются внешними
gates.

Owner membership/invitation list, create и revoke paths теперь канонизируют
provider, invitation и membership UUID до permission lookup и PostgreSQL.
Invitation envelope принимает только роли `manager/staff`, валидный email и
UUID service location; неизвестные поля и malformed values возвращают
`422 VALIDATION_ERROR`. Invitation token trim/формат/длина проверяются до
хеширования и транзакции принятия. Provider membership policy suite прошёл
**4/4**, полный backend unit — **203 файла / 705 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальная SMTP-доставка, HTTP replay,
multi-process accept race и staging branch-scoped workflow остаются внешними
gates.

Owner bonus programme и liability paths теперь канонизируют provider UUID до
permission lookup и provider-scoped чтения/записи. Redeem и manual grant
повторно проверяют UUID клиента/заявки, bounded целые points, reason/name,
проценты, срок действия, active flag и unknown fields; malformed direct calls
возвращают `422 VALIDATION_ERROR` до транзакции. Idempotency-Key для bonus
mutation использует общий safe-character контракт, grant требует ключ, а
redeem сохраняет deterministic fallback. Bonus input policy suite прошёл
**5/5**, полный backend unit — **204 файла / 710 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный owner/client HTTP replay,
PostgreSQL bonus race и staging audit/retention остаются внешними gates.

Owner analytics теперь принимает только canonical provider UUID и использует
его в capability lookup, provider query, branch-scoped requests, reviews,
bonus liability и daily metrics. Malformed direct calls возвращают
`422 VALIDATION_ERROR` до проверки разрешений и PostgreSQL; uppercase/whitespace
UUID приводятся к одному scope key. Analytics service boundary tests прошли
**2/2**, полный backend unit — **205 файлов / 712 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный analytics HTTP replay,
consent/retention evidence и staging multi-location aggregation остаются
внешними gates.

Owner reviews и review-promo paths теперь канонизируют provider/review/request
UUID до provider lookup, branch permission и review mutation; optional provider
filter не может расширить список чужих сервисов. Promo input/code получают
NFKC/trim/uppercase normalization и bounded-проверки discount, service slug и
expiry; malformed direct calls возвращают `422 VALIDATION_ERROR` до PostgreSQL
и transaction lock. Client review create/update отклоняет malformed
request/review identifiers до чтения заявки/отзыва, а redeem promo проверяет
код до транзакции. Review policy и service-boundary suites прошли **6/6**,
полный backend unit — **207 файлов / 718 тестов**, backend build, frontend lint
и `git diff --check` PASS. Реальный review HTTP replay, moderation evidence,
private media, promo redemption race и staging branch-scoped audit остаются
внешними gates.

Public provider profile, offers и reviews теперь канонизируют provider UUID до
чтения профиля, филиалов, офферов и approved reviews. Public service filter
нормализуется через NFKC/trim и bounded-лимит, review limits получают диапазон
`1..50`; malformed direct calls возвращают `422 VALIDATION_ERROR` до
PostgreSQL. Public-provider policy и service-boundary suites прошли **5/5**,
полный backend unit — **209 файлов / 723 теста**, backend build, frontend lint
и `git diff --check` PASS. Реальный публичный HTTP replay, discovery rate
limit и staging media/SEO evidence остаются внешними gates.

Owner calendar/capacity resources и reservations теперь канонизируют
provider/location/resource UUID до branch permission, default-resource reads и
reservation queries. Resource create/update payloads проходят allow-list,
enum, NFKC/trim, capacity `1..100`, boolean и bounded JSON metadata;
reservation ranges требуют offset datetime и безопасный порядок `from < to`.
Malformed direct calls возвращают `422 VALIDATION_ERROR` до
authorization/transaction, canonical branch scope используется во всех
capacity reads/writes. Capacity policy и service-boundary suites прошли **7/7**,
полный backend unit — **211 файлов / 730 тестов**, backend build, frontend lint
и `git diff --check` PASS. Полный resource-level concurrency, multi-process
calendar replay и staging branch schedule остаются внешними gates; lifts и
equipment не расширялись.

Owner communication settings теперь канонизируют provider UUID до owner-scoped
lookup; пробелы и регистр не меняют branch scope, malformed identifiers получают
`422 VALIDATION_ERROR` до PostgreSQL. Communication payload принимает только
allow-list полей; team/business enums, booleans, response window `15..10 080`,
contact note и cross-field правила проходят bounded/NFKC-проверку до
`Object.assign` и `save`. Communication policy и service-boundary suites прошли
**8/8**, полный backend unit — **213 файлов / 738 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный owner HTTP replay, SMTP
delivery и staging consent/retention evidence остаются внешними gates.

Создание профиля сервиса владельцем теперь канонизирует market/zone UUID до
repository lookup; пробелы и регистр не меняют рынок или зону. Невалидные или
смешанные market/zone references получают `422 VALIDATION_ERROR` до чтения
PostgreSQL и открытия транзакции; проверка принадлежности активной зоны
выбранному рынку сохранена. Provider-location policy и service-boundary suites
прошли **4/4**, полный backend unit — **215 файлов / 742 теста**, backend build,
frontend lint и `git diff --check` PASS. Реальный owner onboarding HTTP replay
и staging multi-location verification остаются внешними gates.

Owner offer update теперь канонизирует provider/offer/resource UUID до lookup и
permission check; описание, цена, режим записи и resource arrays проходят
allow-list, NFKC и bounded-проверки. Offer mutation подтверждает принадлежность
оффера выбранному provider через `service_location`; owner provider-wide scope
больше не может изменить оффер чужого сервиса по одному `offerId`. Owner-offer
policy и service-boundary suites прошли **7/7**, полный backend unit — **217
файлов / 749 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный owner catalog HTTP replay, PostgreSQL resource race и staging branch
audit остаются внешними gates.

Offer update теперь проверяет совместимость выбранных active resources с
заявленными resource types; lift/equipment не могут незаметно попасть в offer,
объявленный только для bay/specialist. Проверка выполняется после
provider/location scope и до `save`, без изменения существующего поведения для
офферов без явных resource IDs. Policy и service-boundary suites расширены до
**9/9**, полный backend unit — **217 файлов / 751 тест**, backend build,
frontend lint и `git diff --check` PASS. Полная reservation concurrency и
staging resource replay остаются внешними gates.

Все chat/quote/offer/attachment/confirm/reschedule/no-show/complete/cancel
service-request paths теперь канонизируют request UUID до repository lookup или
transaction; malformed direct calls получают `422 VALIDATION_ERROR`. Offer
decisions дополнительно проверяют message UUID, а attachment reads —
attachment UUID до participant lookup и signed-object access. Request UUID
policy и service-boundary suites прошли **7/7**, полный backend unit — **218
файлов / 754 теста**, backend build, frontend lint и `git diff --check` PASS.
Реальный HTTP replay переходов, PostgreSQL concurrency и staging delivery
остаются внешними gates.

Availability теперь канонизирует provider/location/offering UUID до
активного-provider lookup и расчёта слотов; все запросы заново используют
canonical scope. Дата availability проходит строгую календарную проверку
(включая leap day), а невозможные даты и malformed direct calls получают
`422 VALIDATION_ERROR` до PostgreSQL. Availability policy и service-boundary
suites прошли **5/5**, полный backend unit — **220 файлов / 759 тестов**,
backend build, frontend lint и `git diff --check` PASS. Реальный availability
HTTP replay, timezone matrix и staging capacity evidence остаются внешними
gates.

AutoCare favorites add/remove/sync теперь канонизируют provider/location UUID и
повторно проверяют bounded sync list до PostgreSQL. Duplicate provider IDs
дедуплицируются, malformed references и списки свыше 100 элементов получают
`422 VALIDATION_ERROR`; owner/client scope поведения не менялся. Favorites
policy и service-boundary suites прошли **5/5**, полный backend unit — **222
файла / 764 теста**, backend build, frontend lint и `git diff --check` PASS.
Реальный client favorites HTTP replay и staging deletion/retention evidence
остаются внешними gates.

Публичный trust endpoint теперь канонизирует provider UUID до active-provider
lookup, evidence/snapshot reads и response projection. Malformed direct calls
получают `422 VALIDATION_ERROR` до PostgreSQL; uppercase/whitespace UUID
приводятся к одному публичному provider scope. Trust service-boundary tests
прошли **2/2**, полный backend unit — **223 файла / 766 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный trust HTTP replay, snapshot
expiry/rollout staging и production moderation evidence остаются внешними gates.

Marketplace service теперь канонизирует UUID для repair timeline, broadcast
request/offer, guarantee claim и fleet vehicle до repository lookup, workspace
authorization и transaction. Malformed direct calls получают
`422 VALIDATION_ERROR` до PostgreSQL, включая location UUID в offer mutation;
существующие owner/client authorization paths не изменены. Marketplace
identifier boundary tests прошли **3/3 (8 assertions)**, полный backend unit —
**224 файла / 769 тестов**, backend build, frontend lint и `git diff --check`
PASS. Реальный marketplace HTTP replay, transaction race и staging
branch-scoped workflow остаются внешними gates.

Fair-price query теперь нормализует service, market, make, model и fuel
references до bounded NFKC/trim-значений перед каталогом. Некорректные или
oversized references и `engineLiters` получают `422 VALIDATION_ERROR` до
repository access; нормализованный service reference используется в первом
definition lookup. Marketplace fair-price boundary tests прошли **2/2 (5
assertions)**, полный backend unit — **224 файла / 771 тест**, backend build,
frontend lint и `git diff --check` PASS. Реальный fair-price HTTP replay,
catalog seed parity и production benchmark остаются внешними gates.

Public location-zones query теперь нормализует market reference и parent zone
UUID, проверяет лимит `1..100` и координаты до обращения к каталогу. Trimmed
market code используется в fallback/DB lookup, а canonical parent UUID — в
zone query; malformed direct calls получают `422 VALIDATION_ERROR` до
PostgreSQL. Location-zones boundary tests прошли **4/4**, полный backend unit —
**225 файлов / 775 тестов**, backend build, frontend lint и `git diff --check`
PASS. Реальный location-zones HTTP replay, market hierarchy seed и production
geospatial benchmark остаются внешними gates.

Public discovery query теперь повторно нормализуется на service boundary до
cache key и SQL: bounded текстовые фильтры, UUID зоны, enum sort/price type,
boolean-флаги, радиус и лимиты. Проверяются finite числовые диапазоны,
`minPrice <= maxPrice`, cursor length и unknown fields; malformed direct calls
получают `422 VALIDATION_ERROR` до cache/репозитория. Discovery input policy
suite прошёл **4/4**, полный backend unit — **226 файлов / 779 тестов**, backend
build, frontend lint и `git diff --check` PASS. Реальный discovery HTTP replay,
cursor/market load benchmark и staging rate-limit evidence остаются внешними
gates.

Public analytics events теперь канонизируют provider UUID перед SQL-записью;
malformed profile-open IDs не вызывают запрос к БД. Discovery impression
batches дедуплицируются, суммируются и ограничены 100 provider IDs; пустые,
oversized и non-array входы отбрасываются без SQL. Analytics event boundary
tests прошли **4/4**, полный backend unit — **227 файлов / 783 теста**, backend
build, frontend lint и `git diff --check` PASS. Реальный analytics HTTP replay,
consent/retention evidence и production metrics storage остаются внешними
gates.

Expert-question service теперь повторно нормализует symptoms, categorySlug и
vehicleSnapshot перед JSONB persistence; прямые вызовы не могут обойти границы
HTTP-схемы. Симптомы и категория проходят NFKC/trim и bounded-проверки,
vehicle snapshot использует общий строгий allow-list с request boundary, а
неизвестные поля отклоняются до repository access. Expert-question policy и
service-boundary suites прошли **7/7**, полный backend unit — **229 файлов /
790 тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный
expert-question HTTP replay, moderation/PII retention evidence и staging
workflow остаются внешними gates.

Fleet account и fleet vehicle service теперь повторно нормализуют name, notes,
label и approvalPolicy до repository access; прямые вызовы не могут обойти
route schema. Fleet vehicle JSONB ограничен scalar-record контрактом: только
безопасные ключи, строки/целые числа/null, максимум 24 поля и bounded длины;
текущие UI-поля `brandId`, `registrationNumber`, `internalReference` сохранены.
Fleet input policy и service-boundary regression прошли **5/5**, полный backend
unit — **230 файлов / 795 тестов**, backend build, frontend lint и
`git diff --check` PASS. Fleet/B2B остаётся вне обязательного пилотного scope;
реальный multi-owner workflow и staging authorization остаются внешними gates.

Owner provider onboarding теперь повторно прогоняет полный payload через
runtime-схему до market lookup и транзакции; прямые вызовы не могут записать
невалидные core/profile, schedule или communication поля. Канонизация
market/zone UUID сохранена до Zod-проверки, поэтому uppercase/whitespace UUID
продолжают поддерживаться, а malformed profile values получают
`422 VALIDATION_ERROR` без repository и transaction access. Provider location
boundary suite прошёл **3/3**, полный backend unit — **230 файлов / 796 тестов**,
backend build, frontend lint и `git diff --check` PASS. Реальный owner
onboarding HTTP replay, moderation/SMTP delivery и staging multi-location
workflow остаются внешними gates.

Repair-event helper и внутренний transaction-helper переходов заявки теперь
повторно нормализуют request/actor UUID, eventType, title и notes до JSONB/row
persistence. Metadata ограничены 32 безопасными ключами, scalar-значениями или
bounded scalar-массивами, с finite safe integers и максимальным размером 8 KB;
nested objects, traversal-подобные ключи и oversized payload отклоняются.
Repair-event policy и service-boundary suites прошли **7/7**, полный backend
unit — **232 файла / 803 теста**, backend build, frontend lint и
`git diff --check` PASS. Реальный PostgreSQL audit replay, PII-retention
verification и multi-process transition evidence остаются внешними gates.

Broadcast-request service теперь повторно нормализует service/market
references, issueDescription, vehicleSnapshot, private photo references,
preferredAt и maxProviders до каталога и записи. Неизвестные поля,
короткие/oversized описания, public/traversal media, malformed dates/snapshots
и лимиты вне `1..10` получают `422 VALIDATION_ERROR` без repository access;
даты сохраняются канонически в UTC. Broadcast-request policy и
service-boundary regression прошли **6/6**, полный backend unit — **233 файла /
809 тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный
broadcast HTTP replay, private media storage/AV и multi-provider staging
concurrency остаются внешними gates.

Guarantee-claim service теперь повторно нормализует requestId, claimType,
summary и evidenceUrls до client/request lookup и persistence. Claim types
ограничены `price/quality/warranty/no_show/safety`, summary проходит
NFKC/trim и 10–4 000 символов, evidence остаются private claim references
максимум 20; invalid direct calls получают `422 VALIDATION_ERROR` до
PostgreSQL. Guarantee-claim policy и service-boundary regressions прошли
**6/6**, полный backend unit — **234 файла / 815 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный guarantee HTTP replay,
moderation/PII retention, private S3/AV и multi-process claim race остаются
внешними gates.

Appeal create/decision policies теперь отклоняют неизвестные поля;
сервисные функции принимают `unknown` и используют runtime-валидацию до
subject/evidence lookup и транзакции. Для appeal payload сохранён allow-list
`subject/subjectId/providerId/reason/evidenceIds`, bounded reason/evidence и
UUID-нормализация; decision payload принимает только `status/reason`.
Добавлены regressions для unsupported fields, полный backend unit — **234
файла / 815 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный appeal HTTP replay, moderation evidence viewer, retention/PII review
и staging authorization остаются внешними gates.

Chat и service-request message mutations теперь принимают `unknown`, проверяют
object shape и allow-list полей до participant/thread lookup; прямые `null`,
массивы и лишние поля получают `422 VALIDATION_ERROR` вместо `TypeError/500`.
Общая message policy канонизирует NFKC/trim body и service idempotency key;
idempotency продолжает использовать прежнее строгое правило безопасных 8–128
символов. Добавлены message-policy и service-request boundary regressions
**7/7**, полный backend unit — **234 файла / 818 тестов**, backend build,
frontend lint и `git diff --check` PASS. Multi-process chat
delivery/reconnect, private S3/AV, moderation queue и staging WebSocket smoke
остаются внешними gates.

Chat moderation report policy теперь канонизирует категорию и статус через
NFKC/trim/lowercase и отклоняет неизвестные поля до сохранения отчёта. Chat
creation policy дополнительно отклоняет unsupported fields; существующие UUID,
subject и role checks не изменены. Добавлены regressions для canonical
moderation values и лишних полей, полный backend unit — **234 файла / 818
тестов**, backend build, frontend lint и `git diff --check` PASS.
Полноценная moderation queue UI, multi-process delivery, private S3/AV и
staging chat replay остаются внешними gates.

Chat и service-request conversation queries теперь нормализуют pagination input
до thread/request lookup: поддерживаются только cursor, beforeCursor и integer
limit, конфликтующие курсоры и лишние поля отклоняются. `null`, массивы,
non-string cursors и нецелочисленные limits получают контролируемый
`422 VALIDATION_ERROR`; valid cursor decoding и прежний `400` для
повреждённых/oversized cursors сохранены. Добавлены shared cursor-policy и
service boundary regressions **13/13**, полный backend unit — **234 файла /
822 теста**, backend build, frontend lint и `git diff --check` PASS. Реальный
HTTP pagination replay, multi-process chat reconnect и staging load остаются
внешними gates.

`markNotificationAsRead` теперь канонизирует notification UUID до repository
lookup и возвращает `422 VALIDATION_ERROR` для malformed direct calls вместо
потенциальной ошибки PostgreSQL. Добавлены notification UUID policy и
service-boundary tests **3/3**; в общий unit gate также включён ранее не
подключённый `notification-action-policy.test.ts`. Полный backend unit — **236
файлов / 825 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный notification HTTP replay, SMTP delivery, retention и staging
observability остаются внешними gates.

Notifications list query теперь повторно нормализует cursor, limit, read и
category до repository lookup; категории канонизируются через
NFKC/trim/lowercase. `null`, массивы, неверные типы, oversized cursor и
unsupported fields получают `422 VALIDATION_ERROR`, а user-scoped SQL и
прежний cursor response contract сохранены. Добавлены notification query
policy и service-boundary regressions **6/6**, полный backend unit — **237
файлов / 830 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный notification HTTP replay, SMTP delivery, retention и staging
observability остаются внешними gates.

CRUD иерархии супер-админа (страна, город, зона) теперь повторно проверяет
payload после HTTP-слоя: только разрешённые поля, NFKC/trim строк, schema
constraints, enum и парные координаты. Сервисные функции принимают `unknown`,
нормализуют UUID страны/города/зоны и parent zone до repository lookup;
malformed direct calls получают контролируемый `422 VALIDATION_ERROR`, а
super-admin authorization и hierarchy ownership не изменены. Добавлены
regressions для нормализации, неизвестных полей, координат, enum и UUID **5/5**,
полный backend unit — **238 файлов / 835 тестов**, backend build, frontend lint
и `git diff --check` PASS. Реальный super-admin HTTP replay, staging
authorization matrix, audit viewer и production rollout остаются внешними
gates.

Platform review create теперь повторно проверяет rating `1..5`, текст `10..1000`,
idempotency key и неизвестные поля непосредственно на сервисной границе; текст и
ключ канонизируются через NFKC/trim. Moderator response, public limit и review
UUID также получили bounded runtime-нормализацию до repository lookup;
malformed direct calls получают `422 VALIDATION_ERROR`, существующая idempotency
race recovery сохранена. В общий unit gate подключены ранее не запускавшиеся
platform-review tests и добавлены regressions **12/12**; полный backend unit —
**241 файл / 847 тестов**, backend build, frontend lint и `git diff --check` PASS.
Реальный platform-review HTTP replay, moderation queue, abuse-rate-limit replay,
PII/retention и staging authorization остаются внешними gates.

Обновление trust policy супер-админом теперь повторно проверяет полный payload
на сервисной границе: policy version, bounded numeric thresholds, rollout shape
и неизвестные поля. Rollout market IDs нормализуются в lowercase UUID, дубликаты
и malformed IDs отклоняются до чтения рынков; проверка существования market scope
и super-admin authorization сохранены. Добавлены trust-policy input и
service-boundary regressions **5/5**, полный backend unit — **243 файла / 852
теста**, backend build, frontend lint и `git diff --check` PASS. Реальный
trust-policy HTTP replay, badge reassessment, rollout staging и независимый
security review остаются внешними gates.

Admin provider-status mutation теперь повторно проверяет provider UUID и
enum-статус после HTTP-слоя и до provider lookup; malformed direct calls
получают `422 VALIDATION_ERROR`. Canonical lowercase UUID и NFKC/trim status
сохраняют прежний branch/provider response и не меняют admin authorization или
audit flow. Добавлены provider-status policy и service-boundary regressions
**3/3**, полный backend unit — **245 файлов / 855 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный admin status HTTP replay,
staging authorization matrix, suspended-provider UX и независимый security
review остаются внешними gates.

Outbox retry и dead-letter mutations теперь повторно проверяют event UUID после
HTTP-слоя и до repository lookup; malformed direct calls получают
`422 VALIDATION_ERROR`. Canonical lowercase UUID не меняет существующие outbox
state guards, retry/dead-letter transitions и admin authorization. Добавлены
outbox event policy и service-boundary regressions **3/3**, полный backend unit —
**247 файлов / 858 тестов**, backend build, frontend lint и `git diff --check`
PASS. Реальный outbox worker/retry replay, dead-letter operations, Redis/SMTP
delivery и staging rollback rehearsal остаются внешними gates.

Security Center event detail, status mutation и session-revoke paths теперь
повторно проверяют UUID после авторизации и до repository lookup; malformed
direct calls получают `422 VALIDATION_ERROR`. Status и assignee канонизируются
через enum/lowercase UUID, operator note получает строгий NFKC/trim и лимит
1 000 символов; self-session conflict и super-admin-only authorization
сохранены. Добавлены security-center input и service-boundary regressions
**8/8**, полный backend unit — **248 файлов / 862 теста**, backend build,
frontend lint и `git diff --check` PASS. Реальный Security Center HTTP replay,
active super-admin assignment, session revocation, Redis outage и staging threat
review остаются внешними gates.

System incident recording повторно проверяет тип, severity, title, requestId,
metadata shape и неизвестные поля до транзакции; malformed internal calls
безопасно игнорируются без открытия БД-транзакции. System incident status
mutation теперь канонизирует incident UUID и статус после super-admin
authorization и до repository lookup; переходы `open/acknowledged/resolved` и
запрет reopen сохранены. Добавлены system-incident input и service-boundary
regressions **6/6**, полный backend unit — **250 файлов / 868 тестов**, backend
build, frontend lint и `git diff --check` PASS. Реальный incident ingestion,
alert delivery, status HTTP replay, retention и staging rollback rehearsal
остаются внешними gates.

Security Mitigations query/create/revoke/extend paths теперь повторно проверяют
runtime input после авторизации и до repository/transaction access; неизвестные
поля, `null`, массивы и неверные типы получают контролируемый
`422 VALIDATION_ERROR`. UUID приводятся к каноническому lowercase, IP — к
bounded display/canonical lookup value, reason — к NFKC/trim без control
characters; status/kind/cursor/limit и TTL/extension minutes ограничены
allow-list и безопасными диапазонами. Добавлены security-mitigation input и
service-boundary regressions **7/7**, полный backend unit — **251 файл / 873
теста**, backend build, frontend lint и `git diff --check` PASS. Реальный
IP-block HTTP replay, Redis cache fail-closed, production incident response и
rollback rehearsal остаются внешними gates.

Security Events reader теперь повторно валидирует query после super-admin
authorization и до repository access; неизвестные поля, `null`, массивы и
неверные типы получают контролируемый `422 VALIDATION_ERROR`. Event type
ограничен значениями `SecurityEventType`, user UUID приводится к lowercase
canonical form, cursor и limit нормализуются и ограничены безопасными
диапазонами; прежние redaction, сортировка и cursor response сохранены.
Добавлены security-events input и service-boundary regressions **6/6**, полный
backend unit — **252 файла / 877 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальный security-events HTTP replay, PII/retention
review, audit viewer и staging observability остаются внешними gates.

Admin Audit Logs list/export теперь повторно валидируют query после admin
authorization и до repository access; неизвестные поля, `null`, массивы и
неверные типы получают контролируемый `422 VALIDATION_ERROR`. Поиск, action,
targetType, actor UUID, cursor и limits проходят bounded NFKC/trim-нормализацию;
export limit ограничен `1..10 000`, formula-safe CSV и существующая redaction
сохранены. Исправлены null-boundary регрессии в Security Events и Security
Mitigations query policies; добавлены audit input и service-boundary
regressions **8/8**, полный backend unit — **253 файла / 882 теста**, backend
build, frontend lint и `git diff --check` PASS. Реальный audit HTTP/export
replay, полный audit viewer, PII/retention review и staging authorization
остаются внешними gates.

Admin Users list и status/role mutations теперь повторно валидируют input
после admin/super-admin authorization и до repository access; неизвестные
поля, `null`, массивы, неверные enum, UUID и pagination получают контролируемый
`422 VALIDATION_ERROR`. Поиск нормализуется через NFKC/whitespace bounds,
role/status канонизируются в lowercase, UUID — в canonical form; сохранены
self-block guard, last-super-admin protection, session invalidation и cursor
response. Добавлены admin-users policy и service-boundary regressions **5/5**,
полный backend unit — **255 файлов / 887 тестов**, backend build, frontend lint
и `git diff --check` PASS. Реальный admin users HTTP authorization matrix,
PII redaction review и staging audit/rollback evidence остаются внешними gates.

Admin Account Deletion Requests list/status теперь повторно валидируют input
после super-admin authorization и до repository/transaction access;
неизвестные поля, `null`, массивы, неверные status, UUID и pagination получают
контролируемый `422 VALIDATION_ERROR`. Queue status канонизируется через
NFKC/trim, mutation допускает только `cancelled/completed`, request UUID
приводится к lowercase canonical form; сохранены pessimistic lock, retention
gate, idempotent terminal updates, anonymization и deletion invariants.
Добавлены account-deletion input и service-boundary regressions **6/6**, полный
backend unit — **256 файлов / 892 теста**, backend build, frontend lint и
`git diff --check` PASS. Реальный deletion HTTP replay, storage-failure retry,
backup/restore и staging retention evidence остаются внешними gates.

Admin Cabinets status mutation теперь повторно валидирует cabinet UUID и
статус после admin authorization и до SQL; malformed direct calls получают
контролируемый `422 VALIDATION_ERROR`. UUID канонизируются в lowercase,
статус ограничен `draft/active/blocked`; сохранены bounded legacy list, owner
notification, audit metadata и текущий response contract. Добавлены
admin-cabinet policy и service-boundary regressions **3/3**, полный backend
unit — **258 файлов / 895 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальный admin cabinet HTTP authorization matrix,
moderation UX и staging audit/notification delivery остаются внешними gates.

Создание администратора теперь повторно валидирует payload после super-admin
authorization и до user lookup/save, token generation и email outbox;
неизвестные поля, `null`, массивы и неверные типы получают контролируемый
`422 VALIDATION_ERROR`. Name/email нормализуются через NFKC и auth bounds,
frontend origin проходит URL/origin policy, locale ограничен поддерживаемым
набором; сохранены duplicate-email conflict, pre-verified admin и безопасный
password-setup outbox. Добавлены admin-create input и service-boundary
regressions **6/6**, полный backend unit — **260 файлов / 901 тест**, backend
build, frontend lint и `git diff --check` PASS. Реальный super-admin HTTP replay,
SMTP delivery и staging bootstrap evidence остаются внешними gates.

Обновление legacy-профиля рынка супер-администратором теперь повторно
проверяет market UUID и полный профиль payload после authorization и до
repository lookup/save; malformed direct calls получают контролируемый
`422 VALIDATION_ERROR`. Переиспользованы ограничения legacy market schema:
NFKC/trim для строк, default-locale inclusion, supported locale/currency/timezone,
allow-list capability/legal-link полей и отклонение неизвестных ключей;
canonical UUID сохранён. Добавлены legacy market update policy и
service-boundary regressions **3/3**, полный backend unit — **261 файл / 904
теста**, backend build, frontend lint и `git diff --check` PASS. Реальный
market-admin HTTP replay, staging authorization, audit/rollout evidence
остаются внешними gates.

Для market hierarchy CRUD добавлен отдельный service-boundary gate: country,
city и zone операции отклоняют malformed UUID/payload до repository access.
`getSuperAdminMarketHierarchy` и мутации сохраняют super-admin-only
authorization; обычный admin получает `403` до валидации payload и чтения БД.
Добавлены hierarchy service-boundary regressions **5/5** (13 boundary
assertions), полный backend unit — **262 файла / 909 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный hierarchy HTTP authorization
matrix, duplicate/ownership conflicts и staging audit/rollout evidence
остаются внешними gates.

Для provider membership/invitation service добавлен runtime boundary gate:
provider, invitation и membership UUID, invitation payload и token повторно
проверяются до repository/transaction access. Owner-only authorization
подтверждена для списка, создания и отзыва staff-доступа; client получает
`403` до проверки идентификаторов и БД. Добавлены provider-membership
service-boundary regressions **5/5**, полный backend unit — **266 файлов / 929
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный
invitation email/acceptance replay, multi-location permission matrix, token
expiry и staging audit evidence остаются внешними gates.

Для provider change requests список заявок владельца теперь явно требует
owner role до provider lookup; ранее роль проверялась только в create/cancel
paths. Owner create/cancel и admin list/decision paths получили отдельные
boundary regressions: malformed provider/request IDs, payloads и filters
отсекаются до repository/transaction access, client получает `403` до
валидации. Добавлены provider-change-request service-boundary regressions
**5/5**, полный backend unit — **267 файлов / 934 теста**, backend build,
frontend lint и `git diff --check` PASS. Реальный change-request moderation
replay, document evidence viewer, notification delivery и staging
multi-location authorization остаются внешними gates.

Для catalog-gap creation и admin service-definition update добавлен отдельный
runtime boundary gate: malformed provider/definition/request UUID и payload
отклоняются до provider lookup, repository или transaction access. Admin
list/decision paths сохраняют authorization-first порядок и bounded
status/decision values; client получает `403` до валидации и чтения БД.
Добавлены catalog-gap service-boundary regressions **5/5**, полный backend unit
— **268 файлов / 939 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальный catalog moderation replay, duplicate slug
race, service-catalog rollout и staging audit evidence остаются внешними
gates.

Booking service теперь канонизирует booking/cabinet UUID для истории,
reschedule, cancel, owner status/note и occupied slots до repository lookup;
malformed direct calls получают `422 VALIDATION_ERROR` вместо потенциального
PostgreSQL `500`. Client/owner role guards сохраняют authorization-first
порядок для booking reads и mutations; status/reschedule/cancel workflow и
существующие concurrency/idempotency guards не изменены. Добавлены booking
service-boundary regressions **4/4**, полный backend unit — **269 файлов / 943
теста**, backend build, frontend lint и `git diff --check` PASS. Реальный
booking/reschedule/cancellation/no-show concurrency replay, PostgreSQL restore
и staging pilot evidence остаются внешними gates.

Query списка бронирований у клиента и владельца теперь повторно нормализуется
внутри сервиса до построения SQL: cursor, limit, status и календарные даты
проходят bounded-проверки; неизвестные поля, `null`, массивы,
невалидные/обратные диапазоны получают контролируемый `422 VALIDATION_ERROR`.
Безопасные фильтры передаются в query-builder только в канонической форме,
cursor response и существующие role/idempotency/concurrency guards сохранены.
Добавлены booking list-policy и service-boundary regressions **2/2**, policy-файл
включён в unit-конфигурацию; полный backend unit — **270 файлов / 951 тест**,
backend build, frontend lint и `git diff --check` PASS. Реальный booking list
HTTP replay, PostgreSQL load/concurrency, restore и staging pilot evidence
остаются внешними gates.

`/bookings/occupied` теперь требует активную authenticated session и отдельную
`occupiedSlotsQuerySchema`; сырые `cabinetId/date` больше не попадают в сервис
из unauthenticated route. Service boundary повторно проверяет canonical cabinet
UUID и календарную дату `YYYY-MM-DD` с реальной датой до repository access;
invalid, `null` и non-string dates получают контролируемый
`422 VALIDATION_ERROR`. Добавлены occupied-slot policy и service-boundary
regressions **2/2**, полный backend unit — **270 файлов / 953 теста**, backend
build, frontend lint и `git diff --check` PASS. Реальный occupied-slots HTTP
authorization replay, PostgreSQL booking availability и staging pilot evidence
остаются внешними gates.

Создание бронирования клиентом и владельцем теперь повторно нормализует полный
payload до idempotency lookup, client/cabinet/service lookup и slot validation:
UUID, дата, `HH:mm`, comment, experiment/source и idempotency key получают
bounded canonical form, неизвестные поля отклоняются. Client и owner role guards
остаются первыми; malformed direct calls получают контролируемый
`422 VALIDATION_ERROR`, а book-again, availability, idempotency, notification и
PostgreSQL contention flows сохранены. Добавлены booking creation policy и
service-boundary regressions **2/2**, полный backend unit — **270 файлов / 955
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный
create-booking HTTP replay, duplicate/retry race, PostgreSQL concurrency и
staging pilot evidence остаются внешними gates.

Client reschedule request и owner reschedule decision теперь повторно
нормализуют payload до booking lookup/slot checks/transaction: дата, `HH:mm`,
decision, reason и неизвестные поля получают bounded canonical form. Owner
booking status и note повторно проверяются после role/booking UUID guard;
неизвестный enum и нестроковая/слишком длинная заметка получают контролируемый
`422 VALIDATION_ERROR`, а уведомления и status-history используют канонический
status. Добавлены booking mutation policy и service-boundary regressions
**2/2**, полный backend unit — **270 файлов / 957 тестов**, backend build,
frontend lint и `git diff --check` PASS. Реальный reschedule/status/note HTTP
replay, duplicate decision race, PostgreSQL concurrency и staging pilot
evidence остаются внешними gates.

Owner action-center и client experiment telemetry теперь канонизируют event name
через allow-list/NFKC/trim до записи метрики; произвольные labels, `null`,
объекты и неизвестные события получают контролируемый `422 VALIDATION_ERROR`.
Существующие role guards, HTTP schemas и rate limits сохранены, а metric labels
остаются privacy-safe и фиксированными. Добавлены telemetry normalizer и
service-boundary regressions **3/3**, полный backend unit — **270 файлов / 960
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный
telemetry HTTP replay, metrics backend cardinality review и staging observability
evidence остаются внешними gates.

Client telemetry сохраняет authorization-first порядок: роль клиента проверяется
до event normalization, поэтому не-client с любым payload получает `403`, а
client с неизвестным событием — `422`; произвольные labels не достигают metrics
registry. Добавлена telemetry authorization-order regression **1/1**, полный
backend unit — **270 файлов / 961 тест**, backend build, frontend lint и
`git diff --check` PASS. Реальный telemetry HTTP replay и staging observability
evidence остаются внешними gates.

Client-only transitions `confirm`, `reschedule decision` и `cancel` теперь
выполняют `clientOnly` до request UUID validation, repository lookup и
transaction; чужая роль получает `403` независимо от malformed identifier.
Client ownership, state-transition, idempotency и resource-release guards
сохранены, а regression подтверждает отсутствие DB/transaction side effects на
отказе роли. Добавлена authorization-order regression **1/1**, полный backend
unit — **270 файлов / 962 теста**, backend build, frontend lint и
`git diff --check` PASS. Реальный service-request HTTP authorization matrix,
transition concurrency и staging pilot evidence остаются внешними gates.

Client-only решение service offer теперь проверяет роль клиента до request/message
UUID и decision validation, поэтому чужая роль получает `403` без repository или
transaction side effects. Decision normalizer принимает только канонические
`accept`/`decline`, malformed direct calls получают контролируемый
`422 VALIDATION_ERROR`, а canonical message UUID используется до offer lookup.
Добавлены offer decision policy и service-boundary regressions **2/2**, полный
backend unit — **270 файлов / 964 теста**, backend build, frontend lint и
`git diff --check` PASS. Реальный offer HTTP replay, повторное принятие/отклонение
при конкуренции и staging pilot evidence остаются внешними gates.

Client quote accept/decline теперь канонизирует request UUID после проверки роли
клиента и до открытия transaction; malformed direct calls получают контролируемый
`422 VALIDATION_ERROR` без repository lookup или PostgreSQL lock. Expiry,
повторное принятие, quote-version, booking snapshot, capacity/resource
reservation и concurrent decision guards сохранены. Добавлена quote-decision
service-boundary regression **1/1**, полный backend unit — **270 файлов / 965
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный quote
HTTP replay, PostgreSQL lock/concurrency и staging pilot evidence остаются
внешними gates.

Broadcast-offer service теперь повторно нормализует location UUID, сумму,
валюту, note, длительность и `validUntil` до workspace lookup и transaction;
unknown fields и malformed direct calls получают контролируемый
`422 VALIDATION_ERROR`. Offer snapshot сохраняет только канонические значения,
а fallback duration от опубликованной услуги, provider-scope, duplicate и
max-provider guards сохранены. Добавлены broadcast-offer policy и
service-boundary regressions **4/4**, полный backend unit — **270 файлов / 966
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный
broadcast HTTP replay, provider-limit race и staging pilot evidence остаются
внешними gates.

Public location-zones service теперь безопасно отклоняет `null`, массивы и
другие не-объектные coordinates до чтения `latitude/longitude`, возвращая
контролируемый `422 VALIDATION_ERROR` вместо runtime `TypeError`. Bounds для
широты/долготы, market/parent UUID, limit и fallback/database response contract
сохранены. Добавлены coordinate-shape regressions **2/2**, полный backend unit —
**270 файлов / 966 тестов**, backend build, frontend lint и `git diff --check`
PASS. Реальный location-zones HTTP replay, market hierarchy seed и production
geospatial benchmark остаются внешними gates.

Изменения состояния избранного (`sync`, `add`, `remove`) теперь требуют
подтверждённую почту через `requireVerifiedEmail`; чтение списка избранного
остаётся доступным authenticated users. Rate limit, client-only service boundary,
canonical provider/location UUID и существующие upsert/delete semantics сохранены;
неподтверждённый пользователь получает контролируемый `403
EMAIL_VERIFICATION_REQUIRED` до вызова favorites service. Добавлены regressions
для `requireVerifiedEmail` **2/2**, полный backend unit — **270 файлов / 968
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный favorites
HTTP replay с двумя профилями email verification, session/revocation matrix и
staging pilot evidence остаются внешними gates.

MSW mock/API parity для этих трёх mutation-веток синхронизирован: локальные
неподтверждённые аккаунты получают тот же `EMAIL_VERIFICATION_REQUIRED`, что и
real server. Frontend unit завершён: **145 файлов / 461 тест**.

Public trust endpoint теперь читает не более 100 последних evidence-записей
(`createdAt DESC`) до формирования публичного ответа. Расчёт trust score,
approved/non-expired фильтрация, snapshots и rollout contract сохранены.
Добавлена regression на `take: 100`, полный backend unit — **270 файлов / 968
тестов**, backend build и `git diff --check` PASS. Реальный trust HTTP replay,
production data-volume benchmark и staging observability evidence остаются
внешними gates.

Все AutoCare owner routes теперь вызывают `requireVerifiedEmail` до валидации
params/query/body для capacity/resources, evidence, communication,
membership/invitations, change requests, bonus program, offers, reviews и media
uploads. Контракт `check:owner-route-auth` теперь проверяет auth-before-validation;
regression **4/4** подтверждает guard-порядок. Provider-scope и service-level
permissions сохранены, полный backend unit — **270 файлов / 968 тестов**, backend
build и `git diff --check` PASS. Реальный malformed-input HTTP replay,
session/revocation matrix и staging pilot evidence остаются внешними gates.

Защищённые AutoCare client routes для избранного, chat reports/blocks/attachments,
редактирования отзывов и service-request detail/offer decision/attachments/
reschedule теперь аутентифицируют запрос до `validateParams`, `validateQuery` и
`validateBody`. Admin moderation routes для appeals, evidence, provider change
requests, catalog gaps и chat reports получили тот же auth-before-validation
порядок; malformed unauthenticated input не раскрывает schema/UUID feedback.
Существующие verified-email, role, provider-scope, ownership, audit и rate-limit
guards сохранены. Контракт `check:owner-route-auth` расширен на owner и admin
поверхности и поддерживает generic Fastify route type parameters; regression
**6/6**. Полный backend unit — **270 файлов / 968 тестов**, backend build,
route-auth contract и `git diff --check` PASS. Реальный HTTP replay с malformed
client/admin inputs, session/revocation matrix, PostgreSQL concurrency и staging
pilot evidence остаются внешними gates.

Для `client_vehicles` добавлен PostgreSQL partial unique index
`UQ_client_vehicles_primary`: у одного клиента физически не может быть более
одного `isPrimary = TRUE`. Migration preflight блокирует rollout при
существующих duplicate-primary группах и не выполняет DDL до явной
reconciliation; rollback удаляет только созданный индекс. Создание, изменение и
удаление автомобиля сериализуются под pessimistic lock строки пользователя
внутри одной транзакции; проверка лимита 20 машин и promotion следующего
primary больше не расходятся при параллельных запросах. Schema-contract добавил
обязательный индекс, migration order/inventory, migration regression **4/4**,
полный backend unit — **271 файл / 972 теста**, backend build, frontend lint и
`git diff --check` PASS. Реальный PostgreSQL multi-client race,
account-deletion replay и staging evidence остаются внешними gates.

Входная политика расписания филиала теперь требует ровно по одной записи для
каждого weekday; дубли дней отклоняются до записи в PostgreSQL. Исключения
календаря отклоняют невозможные даты и дублирующиеся даты, а blocked periods
используют строгую ISO calendar-date проверку вместо одного regex. Полная замена
weekly schedule выполняется внутри одной TypeORM-транзакции, поэтому ошибка
сохранения не оставляет филиал без расписания или с частично обновлёнными днями.
Добавлена отдельная cabinet schedule policy и regression suite **3/3**; полный
backend unit — **272 файла / 975 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальный календарный HTTP replay, конкурентное
редактирование расписания и staging booking-availability evidence остаются
внешними gates.

Записи расписания, исключений и blocked periods теперь сериализуются через
`pessimistic_write`-блокировку строки филиала внутри транзакции замены. Owner scope
проверяется до блокировки через `getOwnerCabinetById`; удалённый между чтениями филиал
возвращает контролируемый `404` и не оставляет частичного календарного обновления.
Уникальные ограничения weekday/date, validation и response contract сохранены. Полный
backend unit — **272 файла / 975 тестов**, backend build, frontend lint и
`git diff --check` PASS. Реальный конкурентный calendar HTTP replay и staging
booking-availability evidence остаются внешними gates.

Legacy booking create, owner create/status и client/owner reschedule теперь
проверяют слот тем же `EntityManager`, который выполняет запись, после
`pessimistic_write`-блокировки активной строки филиала. Client reschedule
блокирует booking до проверки pending-запроса, а owner decision блокирует request
и booking; параллельные переходы не используют устаревший внешний snapshot.
Exclusion/idempotency constraints, status guards, notification/audit semantics и
controlled conflict responses сохранены. Полный backend unit — **272 файла / 975
тестов**, backend build, frontend lint и `git diff --check` PASS. Реальный
PostgreSQL multi-client HTTP replay для legacy booking и staging contention
evidence остаются внешними gates.

`GET /bookings/occupied` теперь разрешён только client или owner. Владелец видит
занятость только собственного активного кабинета; admin и другие роли получают
контролируемый `403`, а draft/blocked и чужие кабинеты не раскрывают слоты и
возвращают `404`. MSW mock синхронизирован с этой границей. Добавлена
service-boundary regression для проверки role-before-lookup. Полный backend unit —
**272 файла / 975 тестов**, frontend unit — **145 файлов / 461 тест**, backend
build, frontend lint и `git diff --check` PASS. Реальный HTTP replay для
client/owner/admin и staging privacy evidence остаются внешними gates.

Публичный `GET /v1/providers/:providerId/availability` получил отдельный IP-based
rate limit `autocare:availability` — 60 запросов в минуту. Лимит установлен до
дорогого расчёта календаря; availability остаётся публичным для booking discovery,
а schema/provider/location/offering/date validation и response contract сохранены.
Threat-surface source contract теперь проверяет и constant, и pre-handler маршрута;
полный backend unit — **272 файла / 975 тестов**, frontend unit — **145 файлов /
461 тест**, backend build, frontend lint и `git diff --check` PASS. Реальный
распределённый abuse replay, Redis fail-closed в нескольких процессах и staging
throughput evidence остаются внешними gates.

Migration-validation gate исправлен без изменения схемы данных: анализ forward-
миграций теперь учитывает легитимную замену constraint через `DROP CONSTRAINT →
ADD CONSTRAINT`, а rollback-only `down` re-add не считается второй live-записью.
Повторное имя без предварительного drop по-прежнему блокируется. Контрактные
regressions для drop-and-replace, rollback-only re-add и duplicate без drop прошли
**5/5**. Полный `check:local-mvp` проходит все автоматические проверки; ручной
responsive browser gate остаётся заблокирован только ограничением среды
(`listen EPERM` для loopback-порта). Дополнительно прошли ops harness, security
headers, capacity UI, API runtime/contract, OpenAPI shape/structure и repository
performance/SEO budgets. Production Lighthouse/HTML metadata и staging evidence
остаются внешними gates.

Выполнена автономная ревизия 100 подпунктов из утверждённого MVP/pilot/security
scope; создан отдельный чеклист `PILOT_AUTONOMOUS_100_EXECUTION.md` с честными
статусами `[x]`, `[~]` и `[E]`. Synthetic discovery benchmark выполнен без
PostGIS на 10 000 и 100 000 записей (3 итерации, p95 **4.2 ms** и **21.5 ms**).
Все доступные локальные API/UI/security/operations checks прошли; staging,
реальные участники, backup vault, SMTP/S3/AV, manual devices и independent review
не имитировались и остаются внешними gates.

Error-code source contract добавлен и проходит: registry содержит 20 канонических
значений, все значения уникальны, а каждая ссылка `ERROR_CODES.*` разрешается.
Staging compatibility probe получил чистые функции проверки OpenAPI/path/cache policy
и regressions **3/3**; без `STAGING_API_BASE_URL` внешний HTTP probe намеренно
пропускается. Автоматический aggregator проверяет ровно 100 пунктов и текущие
статусы **92 complete / 8 partial**.

Responsive Chromium matrix после запуска Next production server на
`127.0.0.1:4175` прошла **30/30** для home, services и provider на ширинах 360,
390, 414, 540, 682, 768, 790, 1024, 1280 и 1440 px; failures **0**.
Автоматический aggregator теперь показывает **93 complete / 7 partial**.

В порции 289 новые локальные контракты подключены в общий `quality:backend`:
`check:error-codes`, `test:error-codes`, `test:staging-api` и
`check/test:pilot-autonomous-plan`. Повторный локальный прогон всех новых
проверок и `git diff --check` завершился без ошибок; aggregator подтверждает
100 уникальных пунктов, из которых 93 закрыты локально и 7 честно оставлены
partial до staging/production или реального пилота.

Полный `npm run quality:backend` после подключения новых контрактов также
завершился успешно: все последовательные migration/legacy/ops/auth/API/OpenAPI/
threat/loading/state/client/capacity проверки, tooling, **272 backend-файла /
975 тестов** и backend build — PASS.

В порции 290 staging probe получил bounded timeout, HTTPS/credential validation и
безопасную обработку сетевых ошибок (regressions **5/5**). Media preflight теперь
проверяет signed URL TTL, `private/`-only path, отсутствие `quarantine/`, AES256 и
`state=private` после promotion (regressions **4/4**). Retention rehearsal получил
bounded `--limit` и JSON-вывод (regressions **3/3**), SEO probe — безопасную
валидацию remote base URL (regressions **2/2**). Full `check:local-mvp` с
разрешённым loopback прошёл PASS; backend unit после regressions — **274 файла /
982 теста**.

Порция 291 (04.09.2026) закрыла первые 12 пунктов отдельной автономной очереди.
Создан `MOCK_BACKEND_ROUTE_SNAPSHOT.json`: **227 mock / 257 backend / 2 WebSocket**;
snapshot не содержит payload или пользовательских идентификаторов и проверяется на
drift. Source-contract формы поиска и regressions **2/2** подтверждают empty/error/
partial query states, disabled loading controls, theme-aware skeleton tokens,
длинные RU/EN labels и narrow-card overflow. `ResultsToolbar` получает
`isLoading`, поэтому форма не заменяется skeleton и не принимает ввод во время
загрузки; карта остаётся смонтированной. `ProviderResultCard` защищён от
горизонтального переполнения.

В порции 291 `check:local-mvp -- --static-only` завершил все автоматические
проверки PASS; остаётся только ожидаемый manual responsive browser gate. Новые
`check/test:route-snapshot` и `check/test:discovery-form`, frontend **145 файлов /
461 тест**, backend build и `git diff --check` завершились PASS. Production,
staging и реальные pilot evidence не создавались локально.

Порция 292 (04.09.2026) усилила staging compatibility harness. Probe теперь
возвращает JSON `skipped/blocked/pass`, считает SHA-256 OpenAPI, ограничивает тело
ответа **2 MiB**, нормализует query через `URLSearchParams`, повторяет 502/503/504
с bounded backoff и проверяет JSON Content-Type, security headers, optional CORS,
cache policy для двух discovery variants и `credentials: omit`. Timeout/network
failures получают безопасные коды `STAGING_TIMEOUT`/`STAGING_NETWORK_ERROR`; полный
URL, cookies и Authorization не попадают в diagnostics. Добавлен шаблон
`STAGING_API_EVIDENCE_TEMPLATE.md`.

`npm run test:staging-api` — **9/9 PASS**; `npm run check:staging-api -- --json`
без `STAGING_API_BASE_URL` возвращает безопасный `skipped`. Реальный staging
endpoint и его production evidence по-прежнему требуют внешней инфраструктуры.

Порция 293 (04.09.2026) усилила media pipeline. Production preflight поддерживает
JSON summary без содержимого объектов и bounded streaming read до **10 MiB**.
S3 promotion теперь требует checksum metadata `sha256`, `state=private`, AES256 и
`Content-Disposition: inline`; signed URL при preflight проверяется на точный TTL,
private path и `private, no-store` cache policy. Добавлены regressions для expired
TTL, quarantine-path в любой позиции, path-style/virtual-hosted URL. MIME mismatch,
EXIF removal, checksum и orphan cleanup policies подтверждены backend tests.

`check:media-pipeline` и его regression PASS; targeted backend media suite —
**38/38 PASS**. Реальные S3/ClamAV credentials, cleanup replay и production bucket
не имитировались.

Порция 294 (04.09.2026) добавила `--dry-run` в account-deletion retention
rehearsal: режим не открывает БД и выдаёт versioned JSON summary с bounded
`limit` (1–10 000). Blocked JSON редактирует userId/email и перечисляет только
имена нарушенных инвариантов; outbox payload redaction и retry/dead-letter policy
покрыты unit regressions. Реальный deletion/restore replay и backup vault остаются
staging/production gates.

## Намеренно заблокировано

- `check:pilot-reliability` — 0 реальных response samples и только 1 локальное
  confirmation sample; demo-данные не считаются SLA.
- `PILOT_EVIDENCE_FILE` — реальный anonymized evidence отсутствует; нельзя
  создавать фиктивный файл для закрытия пилота.
- `check:production-media` — заблокирован до внешнего S3-compatible bucket и
  ClamAV; локальный filesystem режим намеренно не считается production proof.
- Две staging API-реплики, Redis outage/reconnect, SMTP, private S3/ClamAV,
  encrypted backup vault, alert delivery и rollback rehearsal требуют внешней
  инфраструктуры.
- Два реальных автосервиса, 5–10 клиентов, реальные автомобили, обращения в
  поддержку и письменный go/no-go требуют участия владельца продукта.
- `npm run test:e2e:real` в этой порции не принят как evidence: backend не
  стартовал без PostgreSQL на `127.0.0.1:5433`, Docker daemon недоступен, а
  browser timeouts были следствием отсутствующего API. После добавления
  preflight тот же запуск теперь завершается до Playwright с понятным
  диагностическим сообщением. Это инфраструктурный blocker, а не регрессия UI.

## Изменение runtime

Server-конфигурация теперь явно загружает `server/.env` при запуске из корня
через `npm --prefix server run …`; значения, переданные процессу, имеют
приоритет, а dotenv не печатает значения секретов.

Валидатор real-pilot evidence дополнительно сканирует JSON на PII-подобные
ключи и email/телефон/VIN значения; это не заменяет ручную проверку источника,
но блокирует случайную публикацию очевидных идентификаторов.

Источник обязательных условий: [`PILOT_SCOPE_FREEZE.md`](./PILOT_SCOPE_FREEZE.md).

Порция 295 (04.09.2026) закрыла backup/restore блок автономной очереди. Добавлен
`check-backup-restore-contract` с JSON-отчётом: проверяются checksum artifact до
restore, basename-bound SHA-256 manifest, запрет восстановления в исходную БД,
уникальные имена архивов, redaction диагностики, RPO/RTO checklist и synthetic
gzip fixture во временной директории без production данных. В attachment storage
добавлен `buildAutoCareAttachmentOrphanReport`: оператор получает список stale
кандидатов без чтения содержимого и без destructive action; quarantine TTL и
grace-period policy проверяются контрактом.

`check:backup-restore` — PASS; `test:backup-restore` — **4/4 PASS**;
`autocare-attachment-storage.test.ts` — **20/20 PASS**. Эти результаты закрывают
локальные пункты 58–65 новой автономной очереди; encrypted vault, WAL/PITR и
изолированный staging restore остаются внешними gates.

Порция 296 (04.09.2026) закрыла оставшиеся локальные MVP-пункты 13–20. Контракт
`check-mvp-interaction-contract` фиксирует keyboard dropdown/Escape smoke,
focus-visible стили, aria-label для icon-only действий, shaped loading shell без
text-only full-screen loader, сохранение URL/draft-фильтров после retry,
deterministic offline/reconnect fixtures и platform payment-provider guard.
`check:mvp-interaction` — PASS, `test:mvp-interaction` — **2/2 PASS**; JSON summary
`check:local-mvp -- --json` уже содержит commit, timestamp, per-check statuses и
counts. Платёжные системы в runtime не включаются; direct payment wording остаётся
в справочной документации о способе расчёта с сервисом.

Порция 297 (04.09.2026) добавила детерминированные media test adapters:
`DeterministicFakeS3Adapter` моделирует quarantine → private promotion,
checksum, read и cleanup в памяти; `DeterministicFakeAntivirusAdapter` различает
clean payload и стандартный EICAR fixture. Backend unit regression — **2/2 PASS**,
server build PASS. Production S3/ClamAV по-прежнему запускаются только через
внешний preflight с реальными credentials.

Порция 300 (04.09.2026) добавила anonymized pilot metrics toolkit:
`parseAnonymizedPilotMetricsCsv` принимает только обезличенные колонки,
`summarizePilotMetrics` считает response/confirmation/cancel/no-show и duplicate
rates, а `validatePilotEvidenceEnvelope` проверяет schema/source, свежесть
timestamp, уникальность participant/journey IDs, non-negative values и
PII-like email/phone/VIN/plate redaction. `test:pilot-evidence-toolkit` —
**4/4 PASS**. Synthetic fixtures не принимаются как real и не создают pilot
evidence файл.

Порция 298 (04.09.2026) добавила Redis fail-closed preflight: versioned JSON
summary, bounded ping timeout до 10 секунд, safe timeout/network diagnostics и
явный exit code. `DeterministicFakeRedisAdapter` моделирует outage → reconnect,
а production rate-limit boundary по-прежнему запрещает process-local fallback.
Source contract и Redis fake regressions — PASS; фактический Redis endpoint,
multi-process outage/reconnect и alert delivery остаются внешними gates.

Порция 299 (04.09.2026) добавила детерминированный transition/concurrency
report: сценарии booking, quote, reschedule, cancellation и no-show показывают
одного committed winner, controlled conflict/idempotent retry, bounded worker
count 1–16, p95/p99 durations, capacity 409 и audit event на каждую операцию.
`redactConcurrencyIncident` скрывает email/phone/VIN из worker/outbox incident
fixture. Backend suite `concurrency-matrix.test.ts` — **6/6 PASS**, contract и
server build PASS; multi-process replay остаётся staging gate.

## Порции 301–302 (04.09.2026)

- `[x]` SEO runner получил bounded HTML response read (2 MiB), локальный
  metadata report для 12 public/provider routes, OG asset existence,
  canonical/robots consistency, URL safety и launch-locale coverage RU/EN/ES/RO.
- `[x]` Release summary фиксирует migration inventory SHA-256, отсутствие
  изменений исторических migrations до boundary `1785700000000`, replacement
  coverage и `productionClaims=false`; `test:release-summary` — **2/2 PASS**,
  summary `blocked=0`.
- `[~]` Deployed HTML/Lighthouse, staging/production backup и реальный pilot
  остаются внешними gates; локальные проверки их не имитируют.

## Порция 303 (05.09.2026) — повторная mock browser-проверка

После локальных изменений в release-аудите повторно прогнаны затронутые
сценарии `autocare-client-public-states`, `owner-communication-settings` и
`autocare-release-audit`: **120/120** тестов на проектах Chromium, mobile и
tablet прошли. Отдельно сценарий длинных ES/RO-меток после устранения cold-route
гонки прошёл **3/3**. Исправлены только локальные контракты теста и доступности:
ожидание новой idempotency-записи бонуса, выбор revoke по конкретному email,
видимый theme-switcher и keyboard-focusable горизонтальная таблица fleet.

Полный frontend unit — **149 файлов / 470 тестов PASS**; `OwnerFleetPanel` unit —
**1/1 PASS**, `npx tsc --noEmit`,
`npm run lint -- --max-warnings=0` и `git diff --check` — PASS. Это evidence
dirty working tree и mock runtime; real Next+API, staging,
device/screen-reader и pilot evidence по-прежнему не создавались и не переводят
V2-MVP-09/OPS/PILOT в `[x]`.

## Порция 304 (05.09.2026) — контроль границы допуска

`check:pilot-autonomous-plan` подтвердил 100 уникальных пунктов (**93 complete /
7 partial**), а следующий локальный backlog — **100/100 complete**. Повторный
`check:mvp-readiness` остаётся заблокированным 4 конфигурационными условиями;
`check:production-operations` — 9 runtime-блокерами и 6 manual rehearsal gates.
`check:release-promotion` и `check:migration-checksum` корректно завершаются
ошибкой без `RELEASE_EVIDENCE_FILE` и `PUBLISHED_MIGRATION_MANIFEST`; локальные
проверки не создают release/applied-migration evidence.

Статус допуска не изменился: следующий шаг требует staging credentials и
применённого migration inventory, затем SMTP/S3/ClamAV, worker/Redis, backup
restore, alert/rollback rehearsal, MFA/SSO, real devices, legal packet и
обезличенный pilot evidence.

## Порция 305 (05.09.2026) — полный mock release-аудит

`npm run test:e2e` завершился **156/156 PASS** на проектах Chromium, mobile и
tablet (13.3 минуты). В выборке прошли public/client state matrix, quote и
bonus idempotency, responsive widths, keyboard/Escape, Axe, локали, owner/admin
сценарии и Next direct-route smoke. Повторный запуск использовал mock runtime;
ожидаемые proxy warnings к отсутствующему API `127.0.0.1:4000` не являются
ошибками тестов и не считаются real-API evidence.

Таким образом локальная browser-регрессия после порций 303–304 не наблюдается.
V2-MVP-09/OPS-13 остаются `[~]` до production Next + real API/staging запуска,
проверки console/runtime errors на опубликованном SHA и внешнего evidence.

## Порция 306 (05.09.2026) — очистка owner marketing copy

- `[x]` Активные EN/RU тексты `marketing.owners` больше не описывают legacy
  аренду кабинетов и monetization; сценарии владельца говорят об автосервисе,
  услугах, расписании, команде и заявках клиентов.
- `[x]` RU partner copy больше не обещает подписки; добавлена translation
  regression на отсутствие legacy commercial формулировок в launch locales.
- `[x]` `translations.test.ts` — **9/9 PASS**, `npx tsc --noEmit`,
  `npm run lint` и `git diff --check` — PASS.
- `[~]` V2-MVP-10 не закрыт полностью: проверка контактов, demo-only данных,
  прав на контент и legal acceptance остаётся внешним gate.

## Порция 307 (05.09.2026) — landing и dashboard copy

- `[x]` Видимые EN/RU landing и owner-dashboard подписи больше не показывают
  beauty/wellness или legacy cabinet сценарии: mock-услуги, категории,
  статистика, guide-тексты и growth-плашка говорят об автосервисах и заявках.
- `[x]` Убраны маркетинговые free/no-card обещания из onboarding и owner CTA;
  прямые сервисные бонусы и юридическое описание оплаты не менялись.
- `[x]` Полный frontend unit — **149 файлов / 471 тест**, translation regression
  — **9/9**, TypeScript, ESLint и `git diff --check` — PASS.
- `[~]` V2-MVP-10 остаётся внешним gate для контактов, demo-only данных, прав на
  контент и legal acceptance.

## Порция 308 (05.09.2026) — owner service locations labels

- `[x]` В owner-dashboard mobile actions и moderation descriptions термин
  «space/пространство» заменён на service location/точка сервиса; backend/API и
  legacy compatibility keys не менялись.
- `[x]` Полный frontend unit — **149 файлов / 471 тест**, translation regression
  — **9/9**, TypeScript, ESLint и `git diff --check` — PASS.
- `[~]` V2-MVP-10 по-прежнему требует внешней проверки контактов, demo-only
  данных, прав на контент и legal acceptance.

## Порция 309 (05.09.2026) — schema-aware pilot evidence PII guard

- `[x]` `validatePilotEvidenceEnvelope` больше не сканирует имена безопасных
  metadata-ключей как PII: `plateCaptured`, `vinCaptured` и `reviewPhotoCount`
  проходят только как безопасные boolean/числовые значения.
- `[x]` Проверка теперь рекурсивно отклоняет реальные email, phone, VIN, plate,
  message и secret values; опубликованный anonymized evidence template принят
  отдельной regression.
- `[x]` `node --test scripts/pilot-metrics-tools.test.mjs` — **6/6 PASS**;
  `npm run check:pilot-evidence-toolkit` и `git diff --check` — PASS.
- `[~]` Реальный staging/production pilot evidence по-прежнему не создаётся
  локально и требует внешних участников, consent и подписанного release gate.

## Порция 310 (05.09.2026) — request-scoped reliability attribution

- `[x]` Reliability metrics больше не сопоставляют `ServiceMessage.senderId` с
  `provider.id`: owner и active provider-membership проверяются как `users.id`,
  branch membership сопоставляется с `request.locationId`.
- `[x]` Client/system messages, revoked memberships, чужие branch и legacy
  provider-id значения исключены из response samples; обновлены reliability,
  quality-monitoring и оба DB preflight scripts.
- `[x]` Regression на owner/member/branch boundaries — **3/3**, общий focused
  reliability policy — **5/5**, backend unit — **276 файлов / 1000 тестов PASS**;
  backend build и `git diff --check` — PASS. `check:local-mvp -- --static-only`
  дал **39 автоматических PASS**, responsive gate остаётся отдельным manual.
- `[~]` Текущий DB preflight корректно заблокирован: в локальном наборе нет пяти
  реальных provider response samples и confirmation reliability; это не заменяет
  staging multi-user pilot evidence и утверждённые SLO thresholds.

## Порция 311 (05.09.2026) — late attachment context guard

- `[x]` После медленного `FileReader` request page повторно сверяет identity /
  provider / location / offering context перед `createAttachment`; navigation,
  logout или смена контекста не могут продолжить upload старого draft без
  актуального generation guard.
- `[x]` Client-path source contract фиксирует request idempotency, in-flight
  duplicate guard, `Promise.allSettled` upload isolation и post-`FileReader`
  context check; `check-client-path` и regression — **8/8 и 2/2 PASS**.
- `[x]` Targeted RequestForm/RequestPage tests — **3/3 PASS**; `check:local-mvp
  -- --static-only` сохранил все **39 автоматических PASS**. Responsive browser
  matrix остаётся отдельным manual gate.
- `[~]` Slow-network real API, identity switch на deployed browser и partial
  private-storage cleanup остаются staging/production evidence conditions.

## Порция 312 (05.09.2026) — staged migration provenance guard

- `[x]` Local release summary теперь проверяет исторические migration edits в
  unstaged, staged и untracked состояниях; staged diff больше не может обойти
  immutability guard перед сборкой evidence.
- `[x]` `check-release-summary.test.mjs` и `check-release-promotion.test.mjs` —
  **6/6 PASS**; `check:release-summary -- --json` — **8 local PASS**,
  `productionClaims=false`, dirty provenance содержит manifest SHA и список
  изменённых файлов.
- `[~]` `RELEASE_EVIDENCE_FILE` и `PUBLISHED_MIGRATION_MANIFEST` намеренно не
  создавались: immutable release SHA, applied inventory и external approvals
  по-прежнему обязательны для promotion.

## Порция 313 (06.09.2026) — полный локальный MVP runtime gate

- `[x]` `check:local-mvp -- --json` дал **41/41 automated PASS** на commit
  `9f7f71044792`: lint, frontend/backend build, unit/API parity, route and
  accessibility contracts, migration/schema/integrity, Redis/concurrency,
  responsive matrix **30/30** и loading/state/client-path checks.
- `[x]` Mock browser suite — **156/156 PASS** (Chromium, mobile, tablet).
  Production Next + real Fastify/PostgreSQL/Redis smoke покрыт теми же 23
  тестами в чистых группах **11/11 + 7/7 + 5/5 PASS**; повторяемый request
  idempotency, offline/timeout retry и owner/admin/super-admin/staff RBAC
  подтверждены. Real helper теперь дожидается успешной `auth/me` hydration и
  service-request response перед быстрым переходом между workspace routes.
- `[x]` Повторная миграция, schema check, AutoCare integrity validation и
  migration smoke завершены успешно; inventory содержит 130 migration files,
  `migration:show` показывает все 130 применёнными на локальном head, pending
  constraints отсутствуют.
- `[~]` Full real suite на одном loopback IP намеренно упирается в production
  refresh limit 30/min; это штатная защита. Групповой прогон очищал только
  `ratelimit:auth:*` Redis keys между группами и не изменял PostgreSQL data.
  Staging/applied migration manifest, deployed HTML/Lighthouse, backup restore,
  multi-process Redis/WS, pilot/legal/device evidence остаются внешними gates.

## Порция 314 (06.09.2026) — повторная проверка на актуальном локальном head

- `[x]` `quality:backend` завершил полный backend quality chain: все source
  contracts, migration/legacy/operations/API checks, **276 backend unit-файлов /
  1000 тестов PASS** и TypeScript build PASS.
- `[x]` На commit `ed06b60d2c8e` `check:local-mvp -- --static-only` дал **40/40
  PASS**; отдельный production Next responsive run дал **30/30** route/width
  checks PASS на 360–1440 px, включая gallery Escape flow.
- `[x]` Локальный Fastify API доступен через `/health/live` (200), production
  Next через `127.0.0.1:5174` (200), `/api/v1/markets` через Next proxy (200),
  `check:real-api` и integration prerequisites с локальным env — PASS.
- `[~]` `/health/ready` остаётся `503 degraded` только из-за 72 старых локальных
  dead-letter outbox rows, накопленных предыдущими browser-прогонами; записи
  не удалялись, поэтому operational history сохранена. Это локальная очистка
  среды, а не дефект MVP-кода.

## Порция 315 (06.09.2026) — real integration и focused acceptance replay

- `[x]` `npm --prefix server run test:integration` с локальными PostgreSQL и
  Redis завершён: **14 test files / 60 tests PASS**; покрыты vehicle lifecycle,
  request/quote/booking transitions, quote expiry/idempotency, branch scope,
  invitations, moderation, bonuses и concurrent capacity paths.
- `[x]` Focused Chromium release acceptance — **5/5 PASS**: discovery
  filters/sort keyboard flow, protected workspace Axe, theme/focus surface,
  public keyboard order и protected workspace keyboard order.
- `[~]` Эти прогоны закрывают локальное автоматическое evidence; visual sign-off
  владельца продукта и VoiceOver/TalkBack на физических устройствах остаются
  ручными условиями checklist и не подменяются браузерной автоматизацией.

## Порция 316 (06.09.2026) — BLOCK-01 focused local execution

- `[x]` Выполнен focused backend unit replay для WebSocket service-chat contract:
  **1 файл / 5 тестов PASS**. Проверены bounded event, caller event id,
  oversized payload rejection и fail-closed revoke/revalidation (close 4403).
- `[x]` Выполнен focused PostgreSQL/Redis integration replay для capacity,
  account-deletion и provider-branch boundaries: **3 файла / 21 тест PASS**.
  Включены quote stale/expiry/idempotency, booking/reschedule/cancel/no-show/
  complete, capacity races, concurrent deletion request/cancel и branch scope.
- `[x]` Выполнен focused frontend replay: RequestForm/date/draft, auth token
  generation и request follow-up — **5 файлов / 10 тестов PASS**.
- `[x]` Результаты сопоставлены с ранее накопленным local MVP gate: `quality:backend`
  (276 файлов / 1000 тестов и TypeScript build), local static 40/40,
  responsive 30/30, mock 156/156, real grouped 23/23 и integration 14/60.
- `[x]` Свежий `npm run check:local-mvp -- --static-only --json` на head
  `ebf3826a8203` выдал машинный summary **40 pass / 1 manual**; единственный
  manual — responsive browser run, поэтому ожидаемый exit code команды равен 1.
- `[~]` Не закрыты без внешнего окружения: multi-process WebSocket revoke и
  suspension, account-deletion completion interleavings, реальные browser
  timezone/DST и A→B logout races, slow-network/device replay, contacts/legal и
  demo-only content approval. Эти шаги помечены `[~]` в `MVP_REMAINING_100_BLOCKS.md`;
  они не объявляются выполненными локально.

## Порция 317 (06.09.2026) — BLOCK-02 operations/security local preparation

- `[x]` Локальный operations harness и его негативные сценарии прошли: **15/15**
  тестов; `check:ops-harness` и `check:production-operations` подтверждают
  redaction, Docker/worker contracts, backup/restore и безопасную диагностику.
- `[x]` Security/abuse contracts прошли: security headers, threat surface (**7/7**
  controls), server security controls (**5/5**), Redis fail-closed (**1/1**).
- `[x]` Backup/restore contract и regressions прошли: все локальные controls,
  checksum/redaction/unique archive проверки и **4/4** теста.
- `[x]` Release/staging contracts прошли локально: release promotion **3/3**,
  provenance **2/2**, staging compatibility **9/9**; release summary на чистом
  SHA `a6de6ff9de7089ba8c002f1775180e09540c23f2` выдал **8/8 local checks**,
  `productionClaims=false` и external gates без подмены.
- `[~]` Production operations preflight корректно остановлен: отсутствуют
  production-like secrets, SMTP, persistent media volume и HTTPS staging URL;
  reported **8 blocked gates + 6 manual rehearsal gates**. Это подтверждает
  отсутствие внешней среды, а не дефект локального контракта.
- `[E]` Не выполнялись без разрешённой внешней среды: staging deployment/DNS,
  MFA/SSO, private S3/ClamAV, encrypted offsite restore, monitoring destinations,
  branch protection, independent security review, tabletop/rollback, Lighthouse
  и owner go/no-go. Эти шаги сохранены как `[E]` в BLOCK-02.

## Порция 318 (06.09.2026) — BLOCK-03 manual/pilot preparation

- `[x]` Свежий `npm run check:local-mvp -- --static-only --json` на head
  `374496054154` выдал **40 pass / 1 manual**: frontend lint, **149 файлов /
  471 тест**, Next production build, backend build, route/API parity, state,
  client-path, design-token, interaction и accessibility contracts прошли.
- `[x]` Предыдущие browser evidence остаются актуальными: production Next
  responsive matrix **30/30** на ширинах 360–1440, focused Chromium acceptance
  **5/5**, mock browser **156/156**, real API grouped **23/23**. Эти результаты
  покрывают автоматическую подготовку public/protected shell, keyboard, Axe,
  loading/skeleton, locales и overflow сценариев.
- `[~]` Clean-browser и desktop visual steps подготовлены, но не превращены в
  owner sign-off. CUA/manual visual replay ранее остановлен системными
  Accessibility/Screen Recording permissions; автоматический Chromium не
  заменяет visual judgement.
- `[E]` VoiceOver/TalkBack, физические iOS/Android устройства, pilot city,
  services, реальные участники, consent/retention, support/legal approval,
  pilot metrics и go/no-go отсутствуют и не создавались локально.

## Порция 319 (06.09.2026) — повторная попытка manual browser replay

- `[~]` Три последовательные попытки открыть Google Chrome через Computer Use
  завершились одинаковым системным сообщением: Accessibility и Screen Recording
  permissions остаются pending в окне ChatGPT Computer Use.
- `[E]` Поэтому screenshot/video, visual judgement и owner sign-off не созданы;
  статусы BLOCK-03 остаются **31 `[~]` / 69 `[E]`**. После выдачи разрешений
  следующим действием будет clean-browser replay без изменения критериев.

## Порция 320 (06.09.2026) — первый успешный manual browser replay

- `[x]` После выдачи permissions открыт clean Chrome на `localhost:3000`.
  Главная проверена в dark и light theme; визуально сохранены shell, hero,
  map, карточки и footer без белого экрана или очевидного overflow.
- `[x]` Public keyboard replay: Tab прошёл `service → location → radius → search`,
  `Return` активировал primary search и открыл `/services?market=moscow&radius=10`.
- `[x]` Dropdown услуги открылся с доступными options и закрылся через Escape;
  provider profile открылся из результатов, gallery dialog открылся и закрылся
  через Escape с возвратом focus на trigger.
- `[x]` На странице результатов вручную видны placeholder/floating labels,
  карта и карточки; на profile видны disabled `model/year` controls.
- `[~]` Это один desktop Chromium replay: остальные ширины, owner/admin и
  mobile menu остаются покрыты автоматикой/ожидают повторного visual replay;
  VoiceOver/TalkBack, owner sign-off и pilot gates по-прежнему внешние.

## Порция 321 (06.09.2026) — protected workspace replay

- `[x]` Owner chats workspace вручную проверен в light и dark theme: sidebar,
  chat list, message panel, composer и protected navigation остаются читаемыми,
  без очевидного overflow/white screen.
- `[x]` Protected Tab order прошёл `theme → notifications → add service → account`
  и вернулся к account trigger после Escape из account menu.
- `[~]` Space-key activation, mobile menu, остальные protected routes и
  физические screen-reader replays требуют отдельного replay; текущая запись
  не заменяет owner visual sign-off.

## Порция 322 (06.09.2026) — owner dashboard и заявки

- `[x]` Owner dashboard вручную открыт в clean Chrome на
  `/owner/dashboard` в dark и light theme. Проверены заголовок рабочего
  пространства, KPI, operational analytics, список новых заявок, точки
  автосервиса, операции и таблица автопарка; очевидного overflow или белого
  экрана не обнаружено.
- `[x]` Owner requests вручную открыты на `/owner/autocare-requests` в light
  theme. Проверены календарь филиала, выбор даты (6 → 7 сентября), рабочая
  очередь и фильтр `Нужно ответить`; список заявок и выбранные детали
  обновились без изменения данных.
- `[x]` В отфильтрованной очереди открыт read-only сценарий истёкшей сметы:
  detail panel показал статус, клиента, автомобиль, срок и безопасные поля
  новой сметы; mutation-кнопки не нажимались.
- `[x]` Evidence freshness подтверждена этим replay 06.09.2026; поэтому шаг
  87 BLOCK-03 отмечен `[x]`.
- `[~]` Точная ширина 768 px, mobile menu, Space-key replay, остальные
  protected routes, screen-reader/device replay и product-owner sign-off
  остаются незакрытыми и не подменяются desktop-проверкой.

## Порция 323 (06.09.2026) — focus-visible light/dark replay

- `[x]` В light theme на owner requests после `Tab` видимый focus ring
  появился на ссылке «Связаться с клиентом»; AX focus подтвердил этот link.
- `[x]` В dark theme после переключения темы и `Tab` видимый focus ring
  появился на ссылке уведомлений; AX focus подтвердил тот же control.
- `[x]` Шаги 23–24 BLOCK-03 отмечены `[x]` по этому desktop Chromium replay.
- `[~]` Mobile/device, VoiceOver/TalkBack и product-owner visual sign-off не
  подменяются этим replay.

## Порция 324 (06.09.2026) — loading shell replay

- `[x]` При reload owner requests в dark theme вручную пойман промежуточный
  loading shell: sidebar/header placeholders, заголовочный каркас,
  календарный блок и skeleton-карточки очереди отображались до появления
  данных; белого экрана не было.
- `[x]` Шаг 16 BLOCK-03 отмечен `[x]` по этому replay.
- `[~]` Light skeleton был загружен, но завершился до визуального capture;
  поэтому шаг 17 (light/dark skeletons) не закрывается этим наблюдением.

## Порция 325 (06.09.2026) — loading/capacity static contracts

- `[x]` `node --test scripts/check-loading-shell.test.mjs` завершён **2/2
  PASS**: static chrome и themed loading placeholders присутствуют, negative
  contract также корректно выявляет отсутствующий control.
- `[x]` `node scripts/check-capacity-ui.mjs` завершён с `Capacity UI contract
  passed`: compact branch calendar и loading wiring сохраняются.
- `[~]` Static contracts не заменяют отдельный визуальный light skeleton
  capture; BLOCK-03 шаг 17 остаётся `[~]`.

## Порция 326 (06.09.2026) — responsive mobile-menu regression fix

- `[x]` Найден и исправлен breakpoint-дефект в
  `DesktopPublicHeader`: на диапазоне 768–1120 px header уже был видим, но
  burger и mobile navigation скрывались через `md:hidden/md:flex`. Trigger и
  desktop navigation переведены на `xl` boundary; desktop public header при
  этом остаётся на месте начиная с `md`.
- `[x]` Изолированный mock replay
  `npm run test:e2e -- e2e/autocare-release-audit.spec.ts -g "public header exposes the correct navigation mode" --project=chromium`
  завершён **1/1 PASS**: проверены 768, 790, 1024, 1120 px, Enter/open,
  Escape/close и 1280 px desktop navigation.
- `[x]` BLOCK-03 шаг 20 отмечен `[x]`; изменения прошли ESLint и `git diff
  --check`.
- `[~]` Это функциональный mock-browser replay; pixel-level visual sign-off,
  реальные устройства и product-owner approval остаются внешними условиями.

## Порция 327 (06.09.2026) — полный release-audit replay

- `[x]` `npm run test:e2e -- e2e/autocare-release-audit.spec.ts --project=chromium`
  в изолированном mock runtime завершён **18/18 PASS**.
- `[x]` Свежий прогон подтвердил release breakpoints, discovery keyboard/Axe,
  mobile-menu boundary и Escape, public/protected keyboard order, gallery
  focus return, все локали, mobile long-label layout, owner services/onboarding,
  owner requests calendar, admin moderation и super-admin market hierarchy.
- `[~]` Автоматический release-audit не заменяет pixel-level visual judgement,
  физические VoiceOver/TalkBack устройства, pilot participants или
  product-owner sign-off.

## Порция 328 (06.09.2026) — полный local MVP gate после breakpoint fix

- `[x]` `npm run check:local-mvp -- --json` на commit `b1559082b87b`
  завершён **41/41 PASS**: frontend lint, **149 файлов / 471 тест**, Next
  production build, backend build, route/API parity, security/media/backup,
  state/loading/interaction contracts и Chromium executable.
- `[x]` Ephemeral Next release server responsive pass завершён **30/30 PASS**
  на ширинах 360, 390, 414, 540, 682, 768, 790, 1024, 1280 и 1440 px;
  failures **0**.
- `[x]` После исправления public mobile-menu breakpoint полный local gate
  повторно подтверждает отсутствие responsive overflow и корректную
  navigation boundary.
- `[~]` Staging probe был корректно пропущен без `STAGING_API_BASE_URL`;
  pixel-level visual judgement, light skeleton capture, реальные устройства и
  внешние approvals остаются отдельными условиями.

## Порция 329 (06.09.2026) — Space-key regression

- `[x]` Добавлен durable Playwright regression в
  `e2e/autocare-release-audit.spec.ts`: theme switcher получает focus,
  `Space` меняет `aria-checked`, второй `Space` возвращает исходное состояние.
- `[x]` `npm run test:e2e -- e2e/autocare-release-audit.spec.ts -g
  "buttons and switches activate with Space" --project=chromium` завершён
  **1/1 PASS** в изолированном mock runtime.
- `[x]` BLOCK-03 шаг 26 отмечен `[x]`; изменение не выполняет mutation API и
  прошло локальный Playwright replay.

## Порция 330 (06.09.2026) — mobile release-audit и static gate

- `[x]` `npm run test:e2e -- e2e/autocare-release-audit.spec.ts
  --project=mobile-chromium` завершён **19/19 PASS** в изолированном mock
  runtime; включая responsive boundary, Space, mobile keyboard/Axe, локали,
  long-label layout, owner/admin/super-admin и request/calendar flows.
- `[x]` `npm run check:local-mvp -- --static-only --json` на commit
  `8dffcf6b5ee1` дал **40 PASS / 1 manual**: frontend lint, **149 файлов /
  471 тест**, Next/backend build и все локальные contracts прошли; единственный
  manual — намеренно пропущенный responsive runtime pass в `--static-only`.
- `[~]` Physical screen readers/devices и external product/legal/pilot
  approvals остаются незакрытыми.

## Порция 331 (06.09.2026) — themed skeleton regression

- `[x]` Добавлен deterministic Playwright replay для `/services`: при
  `waitUntil: commit` в viewport 390×844 boot shell и
  `autocare-results-map-skeleton` видимы до завершения загрузки в light и dark
  theme; `html.dark` проверяется отдельно для каждой темы.
- `[x]` `npm run test:e2e -- e2e/autocare-release-audit.spec.ts -g
  "loading shell keeps themed skeletons" --project=chromium` завершён
  **1/1 PASS**.
- `[x]` BLOCK-03 шаг 17 отмечен `[x]`; visual/device replay и внешние approval
  gates не подменяются этим deterministic browser check.

## Порция 332 (06.09.2026) — tablet cold-route readiness stability

- `[x]` Первый полный tablet Chromium replay выявил только два cold-route
  readiness timeout на `protected workspaces expose a usable keyboard order` и
  `Spanish and Romanian stay usable on mobile with long labels`; остальные
  сценарии прошли, product assertion не показал функционального дефекта.
- `[x]` Изолированный повтор этих двух сценариев завершён **2/2 PASS**.
- `[x]` В `e2e/autocare-release-audit.spec.ts` readiness ожидания для header,
  main и route heading сведены к явному bounded timeout **30 s**, чтобы первый
  lazy-loaded tablet route не зависел от дефолтного 15 s ожидания.
- `[x]` После изменения полный tablet replay завершён **20/20 PASS**.
- `[~]` Это повышает воспроизводимость local mock audit, но не заменяет
  pixel-level visual review, реальные устройства, screen-reader replay или
  внешние product/legal/pilot approvals.

## Порция 333 (06.09.2026) — exact-width route acceptance matrix

- `[x]` Добавлен durable Playwright matrix в
  `e2e/autocare-release-audit.spec.ts`: services на 390/414/540 px, provider на
  682 px, owner на 768 px, admin на 790 px, protected requests на 1024 px,
  public home на 1280 px и super-admin на 1440 px.
- `[x]` Каждый маршрут проверяет видимый shell/heading, `main`, отсутствие
  горизонтального overflow и отсутствие missing translation keys/placeholder
  errors; protected маршруты проходят mock sign-in с owner/admin boundary.
- `[x]` Targeted replay matrix завершён **1/1 PASS**; полный Chromium release
  audit после добавления matrix завершён **21/21 PASS**.
- `[~]` Локальный mock replay закрывает техническую часть этих девяти ширин,
  но их `[~]` статусы остаются до pixel-level visual review, реальных
  устройств и product-owner sign-off.

## Порция 334 (06.09.2026) — local P0/P1 regression sweep

- `[x]` Свежий `npm run check:local-mvp -- --json` на immutable clean SHA
  `8ad66fb955a9` завершён **41/41 PASS**: lint, 149 frontend test files / 471
  tests, Next/backend build, route/API parity, state/loading/accessibility,
  security/media/backup contracts и responsive matrix **30/30**.
- `[x]` Полный Chromium release audit на том же коде завершён **21/21 PASS**;
  exact-width route matrix, protected/public keyboard order, Axe, theme,
  Space/Escape/focus-return, locales и long-label checks не выявили нового
  локального P0/P1 поведения.
- `[~]` Шаг 91 BLOCK-03 остаётся `[~]`: local mock/static sweep не является
  независимым security review, real-device acceptance или pilot go/no-go и не
  отменяет external findings/rechecks из `FINAL_PROJECT_AUDIT_2026-09-05.md`.

## Порция 335 (06.09.2026) — MVP readiness blocker inventory

- `[x]` `npm run check:mvp-readiness` повторно выполнил все repository startup и
  release contracts; локальная проверка точно перечислила **4 blocked config
  gates**: integration DB/Redis/JWT, SMTP, persistent media path и bootstrap
  super-admin, плюс **1 manual external evidence gate**.
- `[x]` Blockers не маскируются synthetic/demo значениями и не переводятся в
  PASS без production-like secrets, storage и ответственного владельца.
- `[E]` Внешняя конфигурация и approval для этого набора отсутствуют, поэтому
  связанные BLOCK-02/03 пункты остаются `[E]`.

## Порция 336 (06.09.2026) — production-operations fail-closed preflight

- `[x]` `npm run check:production-operations` подтвердил repository controls:
  Docker, worker, reminder/outbox/dead-letter, encrypted backup/restore,
  versioned alerts, rollback/migration contract и Redis fail-closed guidance.
- `[x]` Preflight честно остановился на **8 blocked gates + 6 manual rehearsal
  gates**: production env/secrets, JWT/SMTP, persistent media, bootstrap admin,
  outbox encryption, HTTPS staging URL, staging compatibility, worker/Redis/
  SMTP smoke, restore/RPO/RTO, alert delivery и rollback rehearsal.
- `[E]` Без staging credentials, external destinations и операционного владельца
  эти gates нельзя закрыть локальным runtime.

## Порция 337 (06.09.2026) — clean release provenance

- `[x]` `npm run check:release-summary -- --json` на SHA `8ad66fb955a9` вернул
  `environment=local`, `productionClaims=false`, `clean=true`, пустые
  `staged/unstaged/untracked` и **8/8 local checks PASS**.
- `[x]` Migration inventory зафиксирован как **130 файлов** с checksum
  `da0a73b2b6eb0159315b78e482f3d607bc069480577d70676b2b32a64ad0a8fa`; artifact
  и external release evidence намеренно не придуманы.
- `[E]` Production/staging HTML, backup restore и written go/no-go остаются
  внешними gates; локальный summary не повышает `productionClaims`.

## Порция 338 (06.09.2026) — pilot evidence fail-closed boundary

- `[x]` `npm run check:pilot-evidence` корректно отказал с отсутствующим
  `docs/operations/pilot-evidence.json`, требуя anonymized real-pilot evidence
  вместо synthetic/demo файла.
- `[x]` Отсутствующий evidence-файл не создавался автоматически: это сохраняет
  participant IDs, consent, retention, journey uniqueness и signed envelope как
  обязательные внешние входы.
- `[E]` BLOCK-03 шаги 88–90 и 100 остаются внешними до реального pilot
  evidence, consent/retention record, подписанного envelope и go/no-go.

## Порция 339 (06.09.2026) — manual checklist freshness

- `[x]` `docs/operations/MVP_MANUAL_ACCEPTANCE_CHECKLIST.md` обновлён: вместо
  устаревшего static-only SHA/счётчика зафиксированы последний clean baseline
  `8ad66fb955a9`, full local gate **41/41 PASS**, frontend **149 файлов / 471
  тест** и responsive matrix **30/30 PASS**.
- `[x]` В checklist добавлен актуальный Chromium release audit **21/21 PASS**
  с exact-width, keyboard, Axe, theme, locale и overflow coverage.
- `[~]` Companion checklist по-прежнему явно отделяет автоматическую подготовку
  от owner visual sign-off и VoiceOver/TalkBack device gates.

## Порция 340 (06.09.2026) — static-only consistency replay

- `[x]` `npm run check:local-mvp -- --static-only --json` на SHA
  `86c8780bd7b4` повторно дал **40 PASS / 1 manual**; frontend lint, 149/471,
  Next/backend build и все source/API/security/state contracts прошли.
- `[x]` Единственный `manual` — намеренно пропущенный responsive runtime pass
  в static-only режиме, а не ошибка продукта.

## Порция 341 (06.09.2026) — autonomous plan consistency

- `[x]` `npm run check:pilot-autonomous-plan` подтвердил 100 уникальных шагов:
  **93 complete / 7 partial**, без неучтённых пунктов.
- `[~]` Семь partial остаются локально подготовленными до внешнего runtime,
  credentials или owner decision и не переводятся в complete автоматически.

## Порция 342 (06.09.2026) — remaining queue integrity

- `[x]` `npm run check:pilot-autonomous-next` подтвердил следующий локальный
  backlog **100/100** по структуре.
- `[x]` `npm run check:mvp-remaining-blocks` и
  `npm run test:mvp-remaining-blocks` завершены **2/2 PASS**; все BLOCK-01/02/03
  сохраняют ровно 100 нумерованных задач.

## Порция 343 (06.09.2026) — clean release summary after checklist refresh

- `[x]` После отдельного checklist-коммита `d0409cc6967d` повторный
  `npm run check:release-summary -- --json` вернул `clean=true`, пустые
  staged/unstaged/untracked, `productionClaims=false` и **8/8 local checks
  PASS**.
- `[x]` Migration inventory остался неизменным: 130 файлов, checksum
  `da0a73b2b6eb0159315b78e482f3d607bc069480577d70676b2b32a64ad0a8fa`.

## Порция 344 (06.09.2026) — active-doc stale-reference sweep

- `[x]` В active companion checklist больше нет ссылок на устаревший
  `374496054154` или `40/40 PASS`; исторические evidence-register entries
  сохранены как исторические и не переписаны задним числом.
- `[x]` `git diff --check` после обновления checklist прошёл; изменения
  ограничены документацией, runtime/API поведение не менялось.
- `[~]` Staging/production HTML, backup restore, real participants, device
  accessibility и product/legal approvals остаются отдельными внешними gates.

## Порция 345 (06.09.2026) — completion-then-cancel terminal regression

- `[x]` Добавлен PostgreSQL integration сценарий: eligible pending deletion
  переводится в `completed`, последующий cancel возвращает `null`, а request
  остаётся terminal `completed` с `reason=null`, `completedAt` и без
  `cancelledAt`.
- `[x]` Проверка выполняется через production `updateAdminDeletionRequestStatus`
  и `cancelAccountDeletion`, поэтому guard проверяет реальный lock/transition
  порядок, а не только pure policy.

## Порция 346 (06.09.2026) — cancel-then-completion terminal regression

- `[x]` Добавлен обратный interleaving: cancel фиксирует `cancelled`, последующая
  completion получает контролируемый `409`, request не переоткрывается, reason
  сохраняется только для отменённого запроса, `completedAt` остаётся `null`.
- `[x]` Тестовые fixtures изолированы отдельными UUID и удаляются только в
  bounded teardown с `app.audit_retention_cleanup=on`; production data не
  затрагиваются.

## Порция 347 (06.09.2026) — concurrent terminal/audit consistency

- `[x]` `Promise.allSettled` на completion и cancel подтвердил сериализацию
  pessimistic row lock: итогом становится ровно один terminal status, второй
  вызов — idempotent `null` либо controlled `409`.
- `[x]` Audit assertion подтверждает один `account_deletion_cancelled` только
  при победе cancellation и отсутствие ложного completion audit; при победе
  completion anonymization не оставляет actor-linked audit row.
- `[~]` Multi-process replay на deployed PostgreSQL/worker topology всё ещё
  требует staging evidence и не подменяется этим локальным single-process
  integration harness.

## Порция 348 (06.09.2026) — Moscow service timezone browser boundary

- `[x]` Frontend regression запускает RequestForm при frozen instant
  `2026-03-29T22:30:00Z` и browser `America/New_York`; при service timezone
  `Europe/Moscow` availability получает локальную дату `2026-03-30` и UI явно
  показывает `(Europe/Moscow)`.
- `[~]` Реальный browser/device replay с установленной OS timezone и реальным
  API остаётся внешним acceptance условием; JSDOM/Node TZ проверяет только
  локальный контракт без production claims.

## Порция 349 (06.09.2026) — aggregate verification for the five-portion batch

- `[x]` Focused frontend RequestForm suite: **3/3 PASS**; full frontend Vitest:
  **149 файлов / 472 теста PASS**.
- `[x]` Focused account-deletion integration: **5/5 PASS**; полный backend
  integration: **14 файлов / 63 теста PASS**; backend TypeScript build и Next
  production build завершены успешно.
- `[x]` BLOCK-01 задачи C003 **24–27** переведены в `[x]`; C004 шаг 32
  сохраняет `[~]` до real browser/service replay. Canonical progress в
  `PILOT_SCOPE_FREEZE.md` не изменён.

## Порция 350 (06.09.2026) — local database migration and integrity gate

- `[x]` На локальном Docker PostgreSQL (`127.0.0.1:5433`) `npm run server:migrate`
  завершился без pending migrations; TypeORM увидел 130 source migrations и
  130 уже применённых.
- `[x]` `check:autocare-integrity -- --validate` подтвердил **42/42 critical
  tables** с нулевыми count-ошибками и отсутствием pending constraints.
- `[~]` Это локальная seeded database проверка; staging/production backup-
  restore и release owner sign-off остаются внешними gates.

## Порция 351 (06.09.2026) — deterministic local seed replay

- `[x]` Последовательный `demo:reset` → `demo:seed` → `autocare:seed` прошёл
  успешно; demo password и generated provider media созданы штатными скриптами.
- `[x]` API на `127.0.0.1:4000` подтвердил live/readiness contract и real
  market catalog после reseed; seeded data не смешивается с pilot evidence.

## Порция 352 (06.09.2026) — real API browser smoke aggregate

- `[x]` `npm run test:e2e:real` после reseed завершился **23/23 PASS** в
  Chromium, один serial worker, `NEXT_PUBLIC_API_MODE=real`, без MSW.
- `[x]` Покрыты health/market/discovery, communication modes, public/owner/
  admin legacy routes, protected-session boundary, logout, idempotent request,
  request-form offline/timeout recovery и role-scoped workspaces.
- `[~]` Локальный API smoke не является staging HTML, real-participant,
  device-accessibility или production go/no-go evidence.

## Порция 353 (06.09.2026) — stale auth refresh race hardening

- `[x]` Исправлен клиентский race: неуспешный refresh, начатый публичным
  `/auth/me` до login, больше не очищает новый in-memory access token и RTK
  state, выданные конкурентным успешным login; logout/auth-generation также
  остаётся защищённым.
- `[x]` `signIn` helper real smoke ждёт post-login `/auth/me` до 30 секунд,
  сохраняя production rate-limit без отключения или ослабления лимитера.
- `[x]` Полный real smoke после hardening подтвердил **23/23 PASS**, включая
  оба admin legacy route variants.

## Порция 354 (06.09.2026) — local operations batch boundary

- `[x]` ESLint для изменённых TS/Playwright файлов и focused
  `refresh-access-token` suite (**2/2**) прошли; `git diff --check` остаётся
  обязательным перед коммитом.
- `[~]` `check:mvp-readiness`, `check:production-operations` и
  `check:pilot-evidence` продолжают fail-closed на отсутствующих deployment
  secrets, SMTP/media/bootstrap-admin, external pilot envelope и written
  evidence; synthetic artifacts не создавались.

## Порция 355 (06.09.2026) — protected WebSocket heartbeat boundaries

- `[x]` Gateway regression добавил heartbeat recheck для трёх terminal access
  причин: provider suspension, account deletion и JWT/session expiry. При
  потере доступа socket закрывается `4403 Chat access revoked`, доставка
  private event не выполняется.
- `[x]` `service-chat.gateway.test.ts`: **8/8 PASS**; fake timers проверяют
  реальный 30-секундный recheck path без ожидания wall-clock.

## Порция 356 (06.09.2026) — service-date DST and midnight policy

- `[x]` Добавлены deterministic cases для America/New_York spring-forward:
  дата до/после перехода остаётся `2026-03-08`, следующий offset даёт
  `2026-03-09`.
- `[x]` Добавлен Moscow local-midnight case: `2026-01-01T21:00Z` корректно
  отображается как `2026-01-02`, следующий день — `2026-01-03`; browser UTC
  не подменяет service calendar.
- `[~]` Manual OS-timezone/device replay и owner acceptance остаются внешним
  условием, поэтому canonical V2-MVP-05 не переводится в `[x]` автоматически.

## Порция 357 (06.09.2026) — logout failure recovery

- `[x]` Real Chromium smoke добавил offline и HTTP 500 logout cases: клиент
  немедленно возвращается в public shell и показывает локализуемый alert,
  private session state не остаётся на рабочем экране; **2/2 PASS**.
- `[x]` Component regression фиксирует тот же контракт для `FETCH_ERROR` и
  status 500; `LogoutButton` не оставляет unhandled rejection.
- `[x]` Вместе с stale-refresh hardening auth race evidence теперь покрывает
  failed logout, terminal redirect и конкурентную смену access-token generation.

## Порция 358 (06.09.2026) — autonomous local backlog replay

- `[x]` После новых regressions `npm run check:local-mvp -- --static-only`
  подтвердил все автоматические проверки; единственный оставшийся результат —
  ожидаемый manual responsive browser gate.
- `[x]` Frontend suite: **150 файлов / 477 тестов PASS**; lint, Next build и
  backend TypeScript build PASS. MVP queue теперь: BLOCK-01 **88 `[x]` / 12
  `[~]`**, BLOCK-02 **73 `[~]` / 27 `[E]`**, BLOCK-03 **21 `[x]` / 10 `[~]` /
  69 `[E]`**.
- `[~]` Остаток `[~]` — локальная подготовка, которой нужен deployed replay,
  реальное устройство или owner sign-off; `[E]` — staging/production,
  participant, legal и approval dependencies.

## Порция 359 (06.09.2026) — deterministic logout route commit

- `[x]` Выявлено, что обычный BrowserRouter по умолчанию публикует
  navigation через `startTransition`, а `flushSync`-опция `useNavigate` для
  BrowserRouter не применяется. Два production entrypoint теперь используют
  `unstable_useTransitions={false}`, чтобы logout public-route commit был
  синхронным.
- `[x]` `LogoutButton` помечает короткий logout lifecycle, сбрасывает private
  RTK state после `unwrap()` (включая быстрый `FETCH_ERROR`) и повторно
  подтверждает `/`; `RequireAuth` не запускает login redirect в этой границе.
  Focused real Chromium replay: **2/2 PASS** (offline, HTTP 500).
- `[x]` Полный `npm run test:e2e:real` после router-hardening завершился
  **25/25 PASS** в Chromium, один serial worker, real API без MSW; покрыты
  health/catalog/discovery, auth/session, logout failure, request recovery и
  role-scoped workspaces.
- `[~]` Это локальный seeded replay: staging HTML, реальные пользователи,
  устройства/OS timezone, private media/AV, multi-process WebSocket и
  production go/no-go остаются внешними gates.

## Порция 360 (06.09.2026) — responsive Chromium matrix replay

- `[x]` После запуска Next production preview на `127.0.0.1:4175`
  `npm run check:responsive` завершился **30/30 PASS** для home, services и
  provider на ширинах 360, 390, 414, 540, 682, 768, 790, 1024, 1280 и 1440 px.
  Проверены отсутствие горизонтального overflow, видимость shell/content,
  mobile navigation и открытие/закрытие provider gallery через Escape.
- `[~]` Это headless Chromium replay локального preview; pixel-level visual
  judgement, физические iOS/Android устройства, VoiceOver/TalkBack и owner
  sign-off по-прежнему требуют совместного внешнего этапа.

## Порция 361 (06.09.2026) — full local MVP gate

- `[x]` Полный `npm run check:local-mvp -- --json` завершился с **41/41 PASS**:
  lint, 150 frontend-файлов/477 тестов, Next build, backend build, parity,
  media, backup/restore, interaction/accessibility, Redis fail-closed,
  concurrency, routes, legacy/security, SEO и responsive matrix.
- `[x]` Runtime часть gate сама подняла Next production preview на ephemeral
  loopback-порту и зафиксировала responsive matrix **30/30**, после чего
  корректно остановила процесс. Команда не использовала staging credentials,
  real participant data или production claims.
- `[~]` Release summary остаётся локальным (`environment=local`,
  `productionClaims=false`); staging/production HTML, backup vault/restore,
  real pilot participants и письменный go/no-go не создаются автоматически.

## Порция 362 (06.09.2026) — выбранная автономная сотня

Эта порция — execution batch из 100 локальных assertions/операций, а не новые
требования и не расширение канонического знаменателя V2. Шаги сгруппированы по
десять, чтобы сохранить трассируемость без искусственного добавления MVP-gates:

1–10. `[x]` Зафиксированы ветка, remote-baseline, состояние diff, правила
плана, границы production `main` и отсутствие разрешения на внешний go/no-go.
11–20. `[x]` Пересмотрены catalog-quality invariants: active provider/location/
definition scope, orphan offers и корректность price ranges.
21–30. `[x]` Добавлены 5 quality-metrics regressions; targeted pilot slice
проходит **5/5**.
31–40. `[x]` В unit-profile добавлены 12 pilot-critical pure suites;
targeted profile проходит **12 файлов / 39 тестов**.
41–50. `[x]` Pilot-focused backend unit проходит **288 файлов / 1042 теста**;
полный backend suite после исправления privacy-migration contract проходит
**371 файл / 1245 тестов**.
51–60. `[x]` TypeScript build, ESLint и `check:pilot-quality` проходят;
catalog preflight: **19 definitions, 23 active offers, 100% priced**.
61–70. `[x]` Server tooling **5/5**, pilot-evidence toolkit **7/7** и
security/privacy migration contract проходят; stale assertion синхронизирован
с текущей `IS NOT DISTINCT FROM`-политикой.
71–80. `[x]` Предыдущий полный local MVP и real Chromium evidence сохранены:
`check:local-mvp` **41/41**, responsive **30/30**, real API smoke **25/25**.
81–90. `[~]` Evidence/reliability validators запускаются fail-closed: response
samples **0**, confirmation samples **4**, reliability **0%**; нужны реальные
pilot journeys и anonymized source rows.
91–100. `[x]` Release summary показывает **8/8 PASS**, `environment=local` и
`productionClaims=false`; docs/plan/context обновлены, canonical V2 counts и
внешние gates не изменены.

Итог порции: локальный кодовый и контрактный объём закрыт; внешние блокеры
остаются прежними — staging secrets/HTML, S3+ClamAV, backup/restore, Redis и
две реплики, SMTP/alerts, устройства и ручная/legal/pilot приёмка.

## Порция 363 (06.09.2026) — export security batch из 100 шагов

Это отдельный локальный execution batch: он уточняет V2-SEC-13 в коде и
regression-покрытии, но не меняет зафиксированные V2 gates или внешний NO-GO.

1–10. `[x]` Проверены границы `/users/me/export`: authentication, no-store,
bounded collections и целостность export envelope.
11–20. `[x]` Проверены serializer-поля private attachments: `objectKey`,
`uploadedById` и внутренний content checksum не входят в public export shape.
21–30. `[x]` Сохранён отдельный export-level integrity checksum: это digest
выгрузки, а не storage/content hash вложения.
31–40. `[x]` Проверен appeal export: `decidedById` не раскрывается, evidence
references и пользовательская причина остаются связаны с submitted appeal.
41–50. `[x]` Добавлена regression на отсутствие object key и attachment
checksum как в object shape, так и в serialized JSON.
51–60. `[x]` Focused serializer suite проходит **3/3**, backend TypeScript
build проходит.
61–70. `[x]` Pilot-focused unit, full backend suite, lint и local MVP gate
перепроверяются после security-slice.
71–80. `[x]` Проверяются route/OpenAPI/private-response headers и export
integrity contract без ослабления rate limit или auth boundary.
81–90. `[~]` Реальный deployed HTTP replay двух identities, retention/deletion
и restore verification остаются staging/production evidence.
91–100. `[x]` Обновлены plan/context/evidence, diff/release provenance и
commit handoff; canonical V2 status не повышается автоматически.

## Порция 364 (06.09.2026) — sensitive export audit batch из 100 шагов

Эта порция усиливает локальный V2-SEC-15 contract и не заменяет staging replay,
retention verification или независимый security review.

1–10. `[x]` Инвентаризированы все existing audit actions и sensitive
self-service export boundary.
11–20. `[x]` Добавлен bounded action `user_data_exported` в append-only audit
enum без migration: column action уже text и policy normalizes action names.
21–30. `[x]` `/users/me/export` пишет audit row только после authenticated,
bounded export construction и до отправки private response.
31–40. `[x]` Audit row содержит actorId, self target, target type и request
provenance; export payload, checksum, email, VIN, message/media content и
collection counts не записываются.
41–50. `[x]` Интеграционный HTTP replay подтверждает 200/no-store и точный
`user_data_exported` record для текущего пользователя.
51–60. `[x]` Test teardown использует transaction-local
`app.audit_retention_cleanup=on`, как maintenance cleanup; обычный DELETE
по-прежнему блокируется append-only trigger.
61–70. `[x]` Targeted export route integration и backend build проходят.
71–80. `[x]` Pilot-focused/full backend suites, lint и local MVP gate
перепроверяются после audit-slice.
81–90. `[~]` Реальные audit retention, role/ownership, deletion и restore
replays требуют deployed PostgreSQL/staging evidence.
91–100. `[x]` Обновлены plan/context/evidence и release provenance; V2
canonical statuses и productionClaims не изменены.

## Порция 365 (07.09.2026) — unified map-theme batch из 100 шагов

Это локальный execution batch по согласованию визуального поведения карт. Он
не меняет V2-знаменатель и не объявляет production tile SLA.

1–10. `[x]` Инвентаризированы все четыре Leaflet-поверхности: results,
owner-provider, provider-location и cabinet catalog.
11–20. `[x]` Подтвержден keyless OSM default; CARTO с `API KEY REQUIRED` PNG не
используется bundled-конфигурацией.
21–30. `[x]` Проверен one-shot fallback для provider-location URL, чтобы custom
tile failure не оставлял карту на ошибочном endpoint.
31–40. `[x]` Убраны старые `screen`/opacity/brightness-фильтры, рассчитанные на
тёмный CARTO и пересвечивавшие светлые OSM-тайлы.
41–50. `[x]` Добавлен общий light profile без фильтра и moderated night profile
для dark theme только на `.leaflet-tile-pane`.
51–60. `[x]` Маркеры, zoom/location controls, attribution и карточки остаются
вне цветового фильтра и сохраняют контраст.
61–70. `[x]` Проверено переключение light/dark в Chrome на results route:
обычный OSM и ночной профиль отрисовываются без API-key watermark.
71–80. `[x]` ESLint, map tests **3/3**, Next production build и `git diff
--check` проходят.
81–90. `[x]` Отдельный responsive matrix проходит **30/30** на ширинах
360–1440 px; результаты и provider route сохраняют required content.
91–100. `[x]` Static local MVP gate даёт **40 PASS / 1 manual**; manual — только
пропущенный runtime responsive sub-gate (`--static-only`), закрытый отдельным
30/30 replay. Внешние tile SLA, staging и owner sign-off не подменяются.

## Порция 366 (07.09.2026) — map attribution/compliance batch из 100 шагов

Это локальный UX/compliance batch для карт. Он сохраняет keyless OSM policy и
не объявляет наличие коммерческого tile SLA, staging или production approval.

1–10. `[x]` Повторно инвентаризированы все Leaflet-поверхности: results,
owner-provider, provider-location и cabinet catalog.
11–20. `[x]` Сверен источник атрибуции с `MAP_CONFIG`: ссылка ведёт на
`openstreetmap.org/copyright`, а текст содержит `OpenStreetMap` contributors.
21–30. `[x]` Подтверждено, что results map уже получает attribution от tile
layer и не требует отдельного API key.
31–40. `[x]` В owner-provider map удалён `attributionControl: false`; default
Leaflet control теперь создаётся вместе с fallback tile layer.
41–50. `[x]` В provider-location map удалён `attributionControl: false`;
one-shot tile fallback и marker lifecycle не изменены.
51–60. `[x]` На results, owner-provider и provider-location attribution
получил компактную light surface: border, contrast, readable font и safe
internal spacing.
61–70. `[x]` Для всех четырёх поверхностей добавлен dark-theme вариант без
применения tile brightness filter к тексту атрибуции.
71–80. `[x]` Zoom controls остаются скрытыми только там, где это было частью
существующего interaction design; attribution не скрывается.
81–90. `[x]` Map config regression расширен проверкой OSM attribution link и
текста; focused map tests проходят **3/3**.
91–100. `[~]` После локального lint/build и responsive replay остаются внешние
tile-provider SLA, deployed map replay, accessibility owner sign-off и
production monitoring; локальный CSS/DOM contract их не подменяет.

## Порция 367 (07.09.2026) — current AutoCare visual regression gate

Эта порция добавляет воспроизводимый visual gate для текущего AutoCare UI; старые
архивные Bookly screenshots не переиспользуются и не влияют на текущие snapshots.

1–10. `[x]` Добавлен `e2e/visual-regression.spec.ts` с six current routes:
home, discovery, provider, client profile, owner dashboard и admin security
center; покрыты RU/EN, light/dark и guest/protected roles.
11–20. `[x]` Для каждого route зафиксированы desktop/tablet/mobile проекты:
**18/18 PASS** при snapshot update и **18/18 PASS** при обычной проверке.
21–30. `[x]` Visual config переведён на production Next preview, использует
системный Chrome fallback и один worker, чтобы исключить compile-overlay и MSW
parallel-state races.
31–40. `[x]` Snapshots пересозданы только для текущих AutoCare case names;
legacy archive untouched. `git diff --check` проходит.
41–50. `[~]` Pixel-level visual owner sign-off, реальные iOS/Android и
VoiceOver/TalkBack остаются внешними gates; автоматический snapshot не считается
ручной приёмкой.

## Порция 368 (07.09.2026) — local real-API and operations evidence refresh

1–10. `[x]` Docker PostgreSQL/Redis доступны локально; migration run сообщает
`No migrations are pending`; demo и AutoCare seed выполнены идемпотентно.
11–20. `[x]` Backend с process-only local env доступен на `127.0.0.1:4000`;
`check:real-api` проходит, а real API browser smoke завершён **25/25 PASS**.
21–30. `[x]` Production-operations preflight с временными значениями процесса
подтвердил **16/16 локальных pass**: runtime, integration secrets, SMTP shape,
storage shape, S3/attachment contract, bootstrap, outbox, worker, backup,
alerts, rollback и Redis fail-closed guidance.
31–40. `[x]` `check:mvp-remaining-blocks` подтверждает структурную целостность
трёх 100-шаговых execution blocks: по 100 задач в каждом.
41–50. `[~]` `/health/ready` на локальной seeded БД остаётся `503 degraded` не
из-за DB/Redis/storage: read-only aggregate показывает 92 `dead_letter`
`notification.create`, 8 `failed` notification events и 6 `pending` events;
самое старое dead-letter событие — 2026-08-14 UTC, максимум попыток — 5.
Очищать, retry-ить или удалять события без отдельного operational решения не
разрешено.
51–60. `[E]` Реальные production/staging secrets, staging endpoint, SMTP
delivery, backup restore, alert delivery, rollback rehearsal и external
approval по-прежнему отсутствуют и не могут быть доказаны локальным replay.

## Порция 369 (07.09.2026) — PWA build and offline replay repair

1–10. `[x]` Первый PWA smoke выявил две проблемы harness/runtime: отсутствовал
Playwright headless shell, а preview проверял stale `dist`; установленный Chrome
был доступен, но не выбирался конфигурацией.
11–20. `[x]` `playwright.pwa.config.ts` получил одинаковый system-Chrome fallback
с visual config; PWA web server теперь вызывает настоящий `vite build`, который
производит `dist`, обслуживаемый `pwa-preview-server.mjs`.
21–30. `[x]` Vite real bundle получил compile-time MSW boundary в `src/main.tsx`:
при `VITE_API_MODE=real` MSW dynamic import исключается из production/PWA entry,
что устраняет circular vendor execution до React mount.
31–40. `[x]` Свежий Vite build завершился успешно; browser diagnostic подтвердил
service worker `activated` и controller `/sw.js`. Ожидаемый anonymous `/api/auth/me`
401 не считается runtime error.
41–50. `[x]` Полный `npm run test:e2e:pwa` завершился **12/12 PASS** на Chromium и
mobile-Chromium: public cache/offline reload/recovery, logout identity cleanup,
private-cache isolation и offline mutation guard.
51–60. `[x]` Offline assertion уточнён для двух валидных `role=alert` элементов;
это устраняет strict-locator false negative без изменения UI поведения.
61–70. `[~]` Отдельный `tsc -b`, входящий в `npm run build:vite`, всё ещё выдаёт
широкий набор type diagnostics в legacy/mock/translation surfaces; runtime Vite
build и PWA smoke проходят, но full Vite typecheck не считается закрытым и
требует отдельного focused backlog.

## Порция 370 (07.09.2026) — typecheck and production bundle closure

1–10. `[x]` Focused backlog из 42 оставшихся TypeScript diagnostics закрыт без
ослабления compiler settings: `npm exec tsc -- -b --pretty false` завершился
с exit 0.
11–20. `[x]` `npm run build:vite` и real-mode Vite build завершились успешно;
`npm run build` Next.js также завершился успешно.
21–30. `[x]` Regression gates проходят: `npm test -- --run` — 151 файлов и 480
тестов; `npm run lint` — pass; `git diff --check` — pass.
31–40. `[x]` Runtime replay проходит: mock E2E — **168/168**, PWA — **12/12**;
security headers и PWA update contracts также pass.
41–50. `[x]` Performance budget закрыт code-splitting без повышения лимитов:
entry `237.2/400 kB`, largest JS chunk `224.6/300 kB`, largest locale
`75.5/90 kB`, CSS `164.7/175 kB`, JS chunks `86/90`.
51–60. `[~]` Operational readiness остаётся отдельным незакрытым слоем:
seeded outbox backlog сохраняет `/health/ready` в `503 degraded`; staging,
delivery, restore/rollback, external signoff и pilot approval не доказаны.

## Порция 371 (07.09.2026) — reliability attribution hardening

1–10. `[x]` `buildQualityMetrics` больше не принимает legacy provider-id как
ответ сотрудника: ответ засчитывается только для owner или active membership.
11–20. `[x]` Branch-scoped membership проверяется относительно location запроса;
client, system, revoked и другой branch сообщения не попадают в response sample.
21–30. `[x]` Out-of-order input теперь безопасен: сообщения до `request.createdAt`
отбрасываются, а earliest valid provider response выбирается независимо от
порядка входного массива.
31–40. `[x]` Добавлен regression с owner/manager/staff, branch isolation,
client/system и pre-request messages; полный backend suite проходит **371 файлов /
1246 тестов**.
41–50. `[~]` Реальные pilot response/confirmation SLO, multi-provider replay и
staging evidence остаются внешним gate; локальная агрегация не заменяет реальные
participants и owner acceptance.

## Порция 372 (07.09.2026) — browser timezone replay for C004

1–10. `[x]` Локальный Next mock runtime был поднят на loopback; browser-level
replay выполнен в реальном установленном Chrome через Playwright browser API с
context timezone `America/New_York`.
11–20. `[x]` Mock-клиент вошёл в систему, открыл
`/services/api-proservice-moscow/request` и увидел выбранное сервисное время с
явной зоной `Europe/Moscow`, несмотря на отличающийся browser timezone.
21–30. `[x]` Для будущей даты 2026-09-08 и слота 10:00 форма отправила `POST
/api/v1/service-requests` с `preferredAt: 2026-09-08T07:00:00.000Z`; mock API
ответил `201`. Это подтверждает преобразование service-local 10:00 Europe/Moscow
в корректный instant, без browser-timezone arithmetic.
31–40. `[x]` Replay также подтвердил HTML guard для прошлой даты: первоначальная
попытка на 2026-09-05 была остановлена браузерной валидацией (`min` =
2026-09-07), поэтому она не была ошибочно принята за API или timezone failure.
41–50. `[~]` Это локальное mock evidence для CHANGE-C004/C010; staging browser
replay, реальный API, SMTP/worker и pilot acceptance остаются внешними gates.

## Порция 373 (07.09.2026) — identity switch and Back isolation for C009

1–10. `[x]` Mock browser replay вошёл как identity A (`Emily Carter`, client) и
подтвердил приватный `/profile` с `user-client-1` в mock session storage.
11–20. `[x]` UI logout очистил `autocare-hub:mock-session`, перевёл приложение на
public `/` и не оставил старую identity в browser storage.
21–30. `[x]` В том же browser context выполнен вход как identity B (`Sophia
Miller`, owner); session storage содержит только `user-owner-1` / `owner`, а
старый email Emily не появляется в owner dashboard.
31–40. `[x]` Две последовательные Back-навигации после switch не восстановили
Emily или её `/profile`: browser остался на public `/`, затем ушёл в исходную
history boundary `about:blank`.
41–50. `[~]` Локальная mock identity/back regression подтверждена; real API,
staging, multi-device browser и pilot acceptance остаются внешними gates.

## Порция 374 (07.09.2026) — bundle-splitting contract repair

1–10. `[x]` Repository inventory обнаружил реальный failure в
`check:bundle-splitting`: checker ожидал `state-runtime-*`, но текущая Rolldown
сборка поглощала Redux/RTK-зависимости в `autocare-api-runtime`.
11–20. `[x]` Причина устранена в `vite.config.ts` приоритетами групп: React
runtime — `7`, state runtime (`@reduxjs`/`react-redux`) — `6`, UI runtime — `4`;
API/translation группы сохраняют priority `5`, vendor остаётся fallback `1`.
21–30. `[x]` `npm run build:vite` завершился успешно; generated assets теперь
содержат отдельный `state-runtime-DdJf2lW0.js` размером **74.5 kB**.
31–40. `[x]` Bundle contract проходит с 11/11 required prefixes; performance
budget также проходит: entry **237.2 kB**, largest chunk **232.0 kB**, largest
locale **75.5 kB**, CSS **164.7 kB**, JS chunks **87**.
41–50. `[~]` Это подтверждение production-like локального Vite bundle; deployed
CDN caching, Lighthouse и immutable release artifact остаются внешними gates.

## Порция 375 (07.09.2026) — runtime and demo-surface inventory

1–10. `[x]` `check:no-bookly-runtime` и `check:no-legacy-provider` подтверждают,
что production source trees не содержат Bookly или legacy payment-provider runtime
references.
11–20. `[x]` Legacy cleanup contract проходит: 5 legacy families имеют явный
disposition, 130 migration files проверены, а 75 классифицированных legacy files
имеют replacement/archive/tooling rationale.
21–30. `[x]` `check:render-production-config` проходит; production configuration
остаётся отделённой от demo fixture paths и не добавляет legacy runtime boundary.
31–40. `[x]` `check:demo-reset` подтверждает fixture-scoped reset: UUID delete
параметризован, shared catalog защищён, известные AutoCare demo providers —
единственный reset scope.
41–50. `[~]` Локальные runtime/demo contracts подтверждены; реальный deployed
artifact inventory, production contacts/images и owner sign-off остаются
внешними/manual gates.

## Порция 376 (07.09.2026) — production entry fixture boundary

1–10. `[x]` Нейтральный service catalog вынесен из mock provider profiles; основной
`automotive-service` barrel больше не тянет provider contact fixtures в каждый
runtime consumer.
11–20. `[x]` Публичные home components больше не импортируют `providerPreviews`:
provider search остаётся API-backed/free-text, а home fallback использует только
локальные карточки без mock contact profile.
21–30. `[x]` Mock handlers и lazy mock/profile surfaces используют provider fixtures
напрямую, поэтому mock E2E contract не смешивается с initial production entry.
31–40. `[x]` Добавлен `check:production-fixture-leakage`; real-mode Vite build,
checker и full frontend suite проходят. Initial entry `index-CGP3IPkm.js` —
**230.5 kB**, fixture markers `service@example.com` и `+7 (495) 645-35-35` в нём
отсутствуют.
41–50. `[~]` Это локальная проверка initial entry boundary; lazy fixture chunk,
весь deployed artifact inventory, production HTML и owner sign-off требуют
отдельного release/staging evidence.

## Порция 377 (07.09.2026) — mock E2E boundary regression

1–10. `[x]` Полный `npm run test:e2e` после refactor выполнил все 168 сценариев
на Chromium/mobile/tablet; 166 завершились PASS, два mobile сценария упёрлись в
cold-start readiness timeout на provider/discovery shell.
11–20. `[x]` Failure screenshots показывают skeleton/loading shell или filter shell,
а не broken layout; поздние tablet/desktop соответствующие сценарии проходят.
21–30. `[x]` Оба точных failure filters повторно прогнаны на `mobile-chromium`:
provider gallery и discovery shell завершились **2/2 PASS** за 40.7 s.
31–40. `[x]` Full frontend suite остаётся **151 файлов / 480 тестов PASS**;
`npm run build`, real-mode `build:vite`, lint и fixture-leakage checker также
проходят.
41–50. `[~]` Повторный локальный прогон снимает transient harness signal, но не
заменяет стабильный CI/release replay на фиксированном runner и deployed URL.

## Порция 378 (07.09.2026) — bounded mobile route readiness

1–10. `[x]` Mobile gallery assertion получил отдельный bounded wait на route
hydration; release audit shell timeout увеличен только для cold-start harness,
не для product/API operations.
11–20. `[x]` Mobile targeted replay после изменения harness завершился **2/2
PASS**: provider gallery — 20.7 s, discovery breakpoint matrix — 16.6 s.
21–30. `[x]` Проверка сохраняет строгие условия: visible main/heading, no overflow,
localized content и footer; relaxed assertions или skip не добавлялись.
31–40. `[~]` Это стабилизация локального test runner; CI runner variance и
deployed browser evidence остаются внешним release gate.

## Порция 379 (07.09.2026) — API-native review labels and lazy fixture boundary

1–10. `[x]` Featured review API теперь возвращает `providerName` из активного
provider record; mock handler отдаёт тот же shape, а frontend schema принимает
optional label без fixture dependency.
11–20. `[x]` Admin reviews и profile reviews больше не импортируют
`autocareMockData`; реальные provider names приходят из API, cabinet title
используется в client review, поведение mock UI сохранено.
21–30. `[x]` После refactor `npm run build:vite`, backend build и lint проходят;
frontend suite — **151/480**, backend unit profile — **288/1043**.
31–40. `[x]` Admin moderation browser scenario завершён **1/1 PASS**; API-native
provider label не ломает reason-required moderation flow.
41–50. `[x]` Fixture checker сканирует все JS assets: contact markers отсутствуют
в entry и всех lazy chunks, кроме явно разрешённого `favorites-*` anonymous mock
fallback; bundle/performance budgets остаются зелёными.
51–60. `[~]` Anonymous favorites fixture boundary требует отдельного real API
contract, если его нужно полностью убрать из deployed lazy artifacts; staging,
artifact inventory и owner decision остаются внешними gates.

## Порция 380 (07.09.2026) — full generated-asset fixture boundary

1–10. `[x]` Preview fixtures вынесены в отдельный `autocareMockProviders` модуль;
favorites и MSW handlers больше не импортируют profile-only данные с телефоном и
email. Совместимый re-export оставлен для profile/mock consumers.
11–20. `[x]` Profile review/admin surfaces используют API-native provider labels;
profile-only mock data не попадает в публичные preview consumers и не образует
runtime cycle благодаря type-only imports.
21–30. `[x]` `check:production-fixture-leakage` теперь сканирует каждый JS asset
без исключения для `favorites-*`; после нового Vite build demo phone и email не
обнаружены ни в entry, ни в lazy chunks.
31–40. `[x]` Vite build завершён успешно; entry `index-CdJV3qW7.js` — **230.5
kB**. Bundle splitting: 11 required chunks; performance: **2677.8 kB raw /
793.4 kB gzip**; 151/480 frontend tests и lint проходят.
41–50. `[~]` Это полное локальное сканирование generated assets; deployed
artifact inventory, staging replay, production HTML и owner sign-off остаются
внешними release gates.

## Порция 381 (07.09.2026) — post-split browser replay

1–10. `[x]` После разделения preview/profile fixtures production Next build
завершился успешно, а mock E2E выполнил **167/168 PASS** на первом полном
mobile/tablet/desktop прогоне.
11–20. `[x]` Единственный failure — mobile Spanish/Romanian long-label shell,
где `main` не появился в 30-секундный cold-start budget; failure не связан с
данными provider/contact и не изменил assertions.
21–30. `[x]` Точный повтор этого сценария завершился **1/1 PASS** за 22.0 s;
tablet-аналог в полном прогоне также PASS. Это подтверждает transient runner
variance, а не функциональную регрессию fixture-boundary refactor.
31–40. `[~]` Полный single-run 168/168 на стабильном CI runner и deployed browser
evidence остаются release gates; локальная повторная проверка закрывает только
этот конкретный cold-start signal.

## Порция 382 (07.09.2026) — local interaction, route and SEO contracts

1–10. `[x]` Interaction-state contract подтвердил **16 invariants**; discovery
form contract подтвердил 8 source invariants и **2/2** node tests, включая
recoverable loading/error/offline/permission paths и long-label overflow guards.
11–20. `[x]` PWA update contract, Next route inventory (**57 route constants**),
Next production runtime boundary и Next route contract (**5/5 tests**) проходят.
21–30. `[x]` SEO/release repository checks проходят: JS/CSS/image/map budgets,
prerender/ISR variants, metadata paths, canonical/robots consistency и 4 launch
locales подтверждены; local HTML report содержит 12 public/provider routes.
31–40. `[~]` Lighthouse и rendered production HTML остаются двумя manual gates,
требующими deployed `SEO_BASE_URL`; локальный source/build contract не заменяет
эти production evidence.

## Порция 383 (07.09.2026) — PWA and visual regression replay

1–10. `[x]` Production PWA preview завершён **12/12 PASS** на desktop/mobile:
offline discovery/search/provider cache, logout identity-cache cleanup,
authorized-cache exclusion и offline mutation safety подтверждены.
11–20. `[x]` Visual regression replay завершён **18/18 PASS** на desktop, tablet
и mobile для home, discovery, provider, client profile, owner dashboard и admin
security surfaces; baseline screenshots не изменялись и design lock соблюдён.
21–30. `[~]` Это локальный browser evidence текущего рабочего дерева; real-device
assistive technology, deployed URL и owner visual sign-off остаются manual gates.

## Порция 384 (07.09.2026) — clean full mock browser matrix

1–10. `[x]` У mobile long-label release-audit case установлен отдельный bounded
test timeout **120 s**, соответствующий cold lazy-route matrix; product timeout,
assertions, overflow checks и locale checks не ослаблялись.
11–20. `[x]` Повторный полный `npm run test:e2e` завершён **168/168 PASS за
15.6 min** на Chromium, mobile Chromium и tablet Chromium. Включены public/client,
owner/admin, accessibility, keyboard, locale, Next direct-route и privacy flows.
21–30. `[x]` Предыдущий 167/168 signal исчез после harness-only correction;
`npm run lint` и точный long-label replay также PASS. Это подтверждает, что
fixture-boundary refactor не вызвал browser regression.
31–40. `[~]` Матрица полностью подтверждена локально на production-like mock
Next runner; real deployed URL, real-device assistive technology и staging
evidence остаются внешними release gates.

## Порция 385 (07.09.2026) — canonical local MVP gate

1–10. `[x]` `npm run check:local-mvp` завершён с результатом **all local MVP
checks passed** на commit `59b2675e829c`.
11–20. `[x]` Gate включает frontend lint/tests, Next production build, backend
TypeScript build, mock/API parity, route snapshots, migration validation,
media-pipeline и backup/restore contracts.
21–30. `[x]` Также PASS: keyboard/accessibility, Redis fail-closed, transition
concurrency, owner-route auth, threat surface, loading/state/client-path,
design-token, interaction/discovery-form и SEO contracts.
31–40. `[x]` Chromium executable, responsive browser matrix (**25.8 s**) и
whitespace/patch checks прошли; это единый локальный regression gate, а не
ручное выборочное подтверждение.
41–50. `[~]` Dirty working tree и отсутствие deployed SHA/staging credentials
не позволяют превратить local MVP gate в production GO; manual/operations/
security/pilot evidence остаются отдельными обязательными условиями.

## Порция 386 (07.09.2026) — production readiness boundary

1–10. `[x]` `check:mvp-readiness` подтверждает Render startup/migration-free
contract; не хватает только runtime prerequisites и external evidence, а не
исходного production wiring.
11–20. `[E]` Preflight блокируется отсутствующими Redis/PostgreSQL/JWT secrets,
SMTP delivery setup, persistent media path и bootstrap super-admin; эти значения
нельзя безопасно синтезировать в рабочем дереве.
21–30. `[x]` `check:production-operations` подтверждает Docker, dedicated worker,
outbox/dead-letter, encrypted backup harness, alerts, rollback/migration contract
и Redis fail-closed guidance.
31–40. `[E]` Production operations остаётся заблокирован 8 runtime gates и 6
manual rehearsal gates: staging HTTPS endpoint, secret manager, S3/ClamAV,
worker/Redis/SMTP smoke, backup restore, alert delivery и rollback rehearsal.

## Порция 387 (07.09.2026) — autonomous audit plan contract

1–10. `[x]` `check:pilot-autonomous-plan` подтверждает 100 numbered items;
основной execution plan сообщает **93 complete / 7 partial / 0 external**.
11–20. `[x]` `check:pilot-autonomous-next` строго подтверждает отдельный
`PILOT_AUTONOMOUS_100_NEXT.md`: **100/100 complete / 0 partial**, поэтому
подготовленный next-step contract не завис на незакрытой локальной задаче.
21–30. `[~]` Этот contract измеряет автономный локальный plan, а не 54 canonical
pilot gates: secrets, staging, manual acceptance, security review и реальные
участники по-прежнему не могут быть заменены synthetic evidence.

## Порция 388 (07.09.2026) — backend unit/API regression suite

1–10. `[x]` `npm run test:server:unit` завершён: **288 test files / 1043 tests
PASS** за 18.38 s.
11–20. `[x]` Suite покрывает backend services, input policies, authorization,
concurrency, outbox, media, account deletion, AutoCare flows и schema/runtime
boundaries; ожидаемые Redis-outage error logs присутствуют и не превращаются в
ошибки тестового процесса.
21–30. `[~]` Это fresh local unit evidence; real two-replica Redis outage,
production-like PostgreSQL/S3 restore и staging browser/API replay остаются
отдельными operations/security gates.

## Порция 389 (07.09.2026) — security and legacy boundary contracts

1–10. `[x]` Security header contract, Render production config и fixture-scoped
demo reset проходят; reset параметризован, ограничен demo ownership и сохраняет
shared catalog data.
11–20. `[x]` Bookly runtime и legacy payment-provider guards не находят production
references; legacy cleanup audit проходит для 5 семей, replacement coverage 1/1,
migration inventory **130 files** и historical checksum evidence сохраняются.
21–30. `[x]` AutoCare replacement migration boundary (**63 migrations**) и
explicit legacy file dispositions подтверждены; удаление исторических миграций
не выполнялось.
31–40. `[~]` Это repository/runtime boundary evidence; deployed artifact scan,
independent security review и production traffic остаются внешними gates.

## Порция 390 (07.09.2026) — real API replay after demo-outbox reset fix

1–10. `[x]` Demo reset теперь удаляет только outbox payloads, связанные с
текущими demo user/booking/request IDs или demo email; широкого удаления таблицы
или чужих событий нет. Static reset contract прошёл **4/4**, server build и
backend unit profile остаются green (**288 files / 1043 tests**). Свежий
`check:local-mvp` также завершён с результатом **all local MVP checks passed**.
11–20. `[x]` Свежий `npm run test:e2e:real` после фикса reset завершён **25/25
PASS**; Playwright `test-results/.last-run.json` имеет `status: passed`. В
post-replay окне с 13:20 UTC появились только **4 completed
notification.create**, новых dead-letter событий нет.
21–30. `[~]` `/health/ready` всё ещё отвечает **503 degraded**: PostgreSQL и
storage healthy, но Redis `skipped / not_configured`; aggregate сохраняет 106
исторических dead-letter записей (104 `notification.create` с прежней user-FK
ошибкой и 2 `email.send` с redacted ошибкой). Их не очищали вручную; readiness
и worker/Redis/SMTP operations остаются блокерами.
31–40. `[~]` Это сильное local real-API evidence для synthetic/demo journeys,
но не staging/production GO: нужны настроенные Redis/SMTP, обработка
исторического dead-letter backlog по операционной процедуре и внешние
backup/restore, alert, rollback и security/owner gates.

## Порция 391 (07.09.2026) — dependency surface and router compatibility

1–10. `[x]` Production dependency surface сокращён: build/CLI-only Tailwind,
Vite и shadcn packages переведены в `devDependencies`; `react-router` обновлён
до **7.18.3**, Vite — до **8.2.2**, а прямой dev `concurrently` — до **9.2.4**.
11–20. `[x]` `npm audit --omit=dev` для web и server даёт **0 vulnerabilities**;
`npm ci --dry-run --ignore-scripts` воспроизводим. Полный dev audit сообщает
13 tooling-only findings, 7 high/0 critical; CI остаётся привязанным к
production-scope audit.
21–30. `[x]` Router update выявил устаревшие `unstable_useTransitions` props;
оба entrypoint теперь используют поддерживаемый `useTransitions={false}`.
После correction проходят Vite build, Next build, frontend **151/480**, lint и
полный `check:local-mvp`.
31–40. `[~]` Dev-only transitive advisories в CLI/test/build цепочке требуют
отдельного dependency policy/реновации инструментов; они не попадают в
production install scope. Staging artifact scan и immutable release evidence
остаются внешними gates.

## Порция 392 (07.09.2026) — router transition compatibility and final real replay

1–10. `[x]` После обновления `react-router` до **7.18.3** targeted replay
выявил две реальные несовместимости: logout при offline/500 ошибке возвращал
на login вместо public shell, а owner dynamic legacy route зависал на
`Checking session...`.
11–20. `[x]` Причина устранена заменой удалённого/устаревшего флага на
поддерживаемый `useTransitions={false}` в Vite и Next BrowserRouter entrypoints;
product assertions и route contracts не ослаблялись.
21–30. `[x]` Targeted real replay завершён **3/3 PASS**, затем полный
`npm run test:e2e:real` после reset/seed завершён **25/25 PASS за 2.0 min**;
включены logout failure paths, public/owner/admin legacy routes, idempotency,
request recovery и role boundaries.
31–40. `[x]` Повторный `npm run check:local-mvp` после correction также завершён
с результатом **all local MVP checks passed**: lint, frontend tests, Next/Vite,
backend build, contracts и responsive browser matrix.
41–50. `[x]` Финальный `/health/ready` после replay: database/storage `ok`,
outbox `pending=0`, новых dead-letter в replay нет; общий ответ остаётся
`503 degraded` только из-за Redis `not_configured` и 106 исторических
dead-letter записей. Их не удаляли вручную.
51–60. `[~]` Локальный real evidence теперь воспроизводим после dependency
update, но production/pilot GO не меняется: остаются Redis/SMTP/S3/secrets,
staging URL, backup/alert/rollback rehearsal и external security/owner gates.

## Порция 393 (07.09.2026) — router compatibility regression guard

1–10. `[x]` Добавлен `check:router-compatibility`: оба production entrypoint
обязаны использовать поддерживаемый `useTransitions={false}` и не содержать
`unstable_useTransitions`.
11–20. `[x]` Добавлен negative regression test: он намеренно подставляет
устаревший prop в `src/main.tsx` и проверяет, что контракт блокирует такую
регрессию; текущие contract и test suites проходят **2/2**.
21–30. `[x]` Оба проверки включены в `check:local-mvp`; существующая shell-free
команда inventory и dry-run tests остаются зелёными.
31–40. `[~]` Это усиливает локальный compatibility gate, но не заменяет
deployed browser evidence и внешний pilot/security sign-off.

## Порция 394 (07.09.2026) — visual regression after router guard

1–10. `[x]` Текущий `npm run test:e2e:visual` завершён **18/18 PASS за 51.7 s**:
desktop, tablet и mobile Chromium для home, discovery, provider, client,
owner и admin surfaces.
11–20. `[x]` Визуальные baselines не изменились; проверка подтверждает, что
Router compatibility guard не вызвал layout/theme/route-hydration drift.
21–30. `[~]` Screenshot evidence остаётся локальным baseline; real devices,
assistive technology и deployed visual sign-off по-прежнему внешние gates.

## Порция 395 (07.09.2026) — malformed request-date browser recovery

1–10. `[x]` Добавлен real-API Chromium regression для
`/services/api-proservice-moscow/request?date=garbageT12:00:00&time=10:00`.
Страница сохраняет usable `<main>` и не оставляет malformed date в URL.
11–20. `[x]` Targeted replay завершён **1/1 PASS за 18.1 s**; это усиливает
существующие `RequestForm`/date parser unit tests browser-level evidence.
21–30. `[x]` После добавления сценария полный `npm run test:e2e:real` завершён
**26/26 PASS за 2.0 min**; `test-results/.last-run.json` имеет `status: passed`.
После короткого worker interval `/health/ready` показал database/storage `ok`,
outbox `pending=0`, `deadLetter=106`; новые dead-letter события не появились.
31–40. `[~]` Полный workflow request/quote/booking и timezone correctness всё
ещё требуют отдельного PostgreSQL/staging replay; один malformed-query case не
закрывает весь `V2-MVP-05/06` scope.

## Порция 396 (07.09.2026) — performance budget and deferred auth bundle

1–10. `[x]` Первый свежий `npm run check:performance` после real replay нашёл
**92 JS assets при лимите 90**. Лимит не повышался: vendor splitting
консолидирован в пределах **300 kB** для отдельного чанка, а login и OAuth
callback переведены в один deferred `auth-pages` bundle.
11–20. `[x]` После rebuild performance contract проходит: **90/90 JS assets**,
entry **152.0 kB**, largest non-entry **230.0 kB**, largest locale **75.5 kB**,
CSS **166.3 kB**; bundle-splitting contract также PASS с 11 обязательными
chunk-prefixes.
21–30. `[x]` `npm run lint`, targeted route/auth tests (**2 files / 3 tests**),
`npm run test:e2e:real` (**26/26 PASS за 2.4 min**), `git diff --check` и
production fixture leakage contract проходят. Объединение затрагивает только
deferred loading, URL и компоненты auth не менялись.
31–40. `[~]` Performance evidence локальна для production-like build; CDN,
Lighthouse, deployed Next artifact и реальный staging-профиль остаются
внешними release gates. `/health/ready` после replay по-прежнему деградирован
только из-за не настроенного Redis и исторического dead-letter backlog.

## Порция 397 (07.09.2026) — production operations and external evidence boundary

1–10. `[x]` Свежий `npm run check:production-operations` подтверждает Docker
daemon и все repository contracts: dedicated worker, bounded outbox/dead-letter,
encrypted backup/restore harness, alert rules, rollback/migration и Redis
fail-closed guidance — **6/6 PASS**.
11–20. `[x]` `check:pilot-evidence-toolkit` PASS: schema, duplicate/freshness,
non-negative metrics, CSV conversion и PII guards присутствуют. `check:seo`
подтверждает JavaScript/CSS/image budgets, prerender, OG/canonical/robots,
locale coverage и **12** локальных HTML metadata routes.
21–30. `[~]` Operations preflight честно оставляет **8 blocked** configuration
gates: production mode, PostgreSQL/Redis/JWT, JWT strength, SMTP, persistent
media path, bootstrap super-admin и outbox secret; private filesystem storage
остаётся manual до S3. Дополнительно **6 manual** rehearsal gates требуют
staging API, worker/Redis/SMTP smoke, isolated restore, alert delivery и
rollback.
31–40. `[~]` `check:pilot-evidence` и `check:pilot-metrics` fail closed без
`docs/operations/pilot-evidence.json`, `PILOT_METRICS_CSV` и anonymized real
pilot rows; synthetic data не выдаётся за real evidence. SEO repository checks
проходят, но deployed Lighthouse и rendered production HTML остаются manual.

## Порция 398 (07.09.2026) — pilot evidence path resolution

1–10. `[x]` Исправлен локальный tooling defect в server-side
`check:pilot-evidence`: команда запускается из `server/`, поэтому default
`docs/operations/pilot-evidence.json` теперь разрешается от корня репозитория,
а явно переданный absolute path сохраняется без изменений.
11–20. `[x]` Добавлены три regression tests для default, relative и absolute
path resolution; все **3/3 PASS**, server TypeScript build PASS. Проверка
теперь корректно показывает абсолютное место отсутствующего файла, не меняя
fail-closed policy и не создавая synthetic/real evidence.
21–30. `[~]` `check:pilot-evidence` по-прежнему блокируется отсутствующим
anonymized real-pilot JSON — это ожидаемый внешний gate, а не скрытая ошибка
рабочего дерева. `PILOT_METRICS_CSV` и реальные participant/journey rows также
остаются обязательными для принятия pilot metrics.

## Порция 399 (07.09.2026) — curated backend unit coverage for evidence tooling

1–10. `[x]` Новый path-resolution regression добавлен в curated
`server/vitest.unit.config.ts`, поэтому общий backend unit profile теперь
включает его, а не только отдельный targeted invocation.
11–20. `[x]` Свежий `npm run test:server:unit` завершён **289 test files / 1046
tests PASS**. Ожидаемые Redis-unavailable error logs остаются fail-closed
coverage и не являются падением suite; server build и `git diff --check` PASS.
21–30. `[~]` Curated local coverage усилена, но реальный pilot evidence по-
прежнему нельзя вывести из synthetic rows: внешний anonymized JSON/CSV,
staging participant journeys и owner acceptance остаются обязательными.

## Порция 400 (07.09.2026) — Docker-backed schema and integrity rehearsal

1–10. `[x]` Локальный Docker synthetic stack подтверждён: PostgreSQL и Redis
работают на `localhost:5433/6379`. `npm --prefix server run schema:check` и
повторный `migration:smoke` завершились успешно; migration inventory показывает
полностью применённую цепочку до **216**.
11–20. `[x]` `check:autocare-integrity -- --validate` проверил critical manifest
из **42 таблиц** и ownership/context invariants: все counters **0**, pending
constraints **0**. `check:account-deletion-retention` PASS для 0 completed
deletions; отсутствие completed synthetic deletions не выдаётся за deletion
rehearsal с реальными участниками.
21–30. `[~]` Redis fail-closed script в development намеренно сообщает
`skipped` (`fail-open` разрешён только локально); production-mode rehearsal
не засчитывается без корректной production configuration, SMTP/S3 и staging
credentials. Docker evidence усиливает локальную DB/integrity уверенность, но
не закрывает multi-process Redis, restore, staging или pilot gates.

## Порция 401 (07.09.2026) — synthetic production Redis fail-closed probe

1–10. `[x]` Временный process-only synthetic production configuration с
HTTPS loopback origins, сильными non-persistent secrets, S3/ClamAV policy и
`MAIL_MODE=smtp` успешно прошёл env boundary; реальные значения в файлы не
записывались.
11–20. `[x]` При локальном Docker Redis `npm --prefix server run
check:redis-rate-limit -- --json` вернул `status=pass`, `mode=fail-closed`,
`distributed limiter is reachable`; timeout contract сохранился на 5000 ms.
21–30. `[~]` Эта проверка подтверждает production configuration path и один
локальный Redis process, но не является staging evidence: multi-process outage,
reconnect, worker/WS smoke, S3 delivery, SMTP mailbox и external alerting
остаются отдельными gates.

## Порция 402 (07.09.2026) — Docker-backed backend integration profile

1–10. `[x]` Добавлен корневой wrapper `npm run test:server:integration`, чтобы
полный PostgreSQL-backed integration profile запускался из того же интерфейса,
что и unit profile, без ручного перехода в `server/`.
11–20. `[x]` Свежий повторный запуск завершён: **14 test files / 63 tests PASS**.
Покрыты schema contract, auth/session, account deletion, outbox/lease, owner и
admin authorization, AutoCare discovery/capacity/branch access и route guards;
границы `limit=51` и `radiusKm=0` подтверждены как HTTP 400.
21–30. `[~]` Это локальный Docker evidence с synthetic fixtures: реальный
staging multi-process replay, production credentials, external delivery и
participant acceptance остаются внешними gates.

## Порция 404 (07.09.2026) — cross-process Redis realtime smoke

1–10. `[x]` `NODE_ENV=test REDIS_HOST=localhost REDIS_PORT=6379 npm --prefix
server run smoke:autocare-realtime` подтвердил два независимых Redis-backed
subscriber process и повторную доставку одного `eventId`; realtime smoke
завершился PASS.
11–20. `[x]` Проверка не оставила временных процессов или Redis-ключей и не
затронула production secrets. Это усиливает локальное доказательство bridge,
deduplication и reconnect-пути.
21–30. `[~]` Две локальные реплики не заменяют staging/prod replay с реальными
WS-сессиями, revoke/suspension, Redis outage/reconnect и внешним alerting.

## Порция 405 (07.09.2026) — cross-process Redis rate-limit smoke

1–10. `[x]` Добавлен `npm run smoke:server:redis-rate-limit` и отдельный
unit-contract для отчёта smoke. Два независимых worker process используют один
уникальный Redis bucket с лимитом 1; свежий запуск вернул
`schemaVersion=1,status=pass,processCount=2,allowedCount=1,deniedCount=1`.
11–20. `[x]` Worker lifecycle закрывает Redis connection, временный bucket
удаляется, а post-run `redis-cli --scan` не находит smoke keys. Server build,
targeted script tests и lint проходят.
21–30. `[~]` Локальный multi-process consistency закрыта, но реальный staging
outage/reconnect, failover, TLS/secret-manager и production observability остаются
внешними условиями; пункт 57 не переводится в `[x]`.

## Порция 406 (07.09.2026) — full local MVP replay after Redis harness

1–10. `[x]` Повторный `npm run check:local-mvp` после добавления
`smoke:redis-rate-limit` завершён с результатом **all local MVP checks passed**.
Frontend lint/tests, Next production build, backend build, mock/API parity,
media/backup, interaction/accessibility, route/runtime, legacy/payment guards и
SEO contracts прошли.
11–20. `[x]` Responsive Chromium matrix в этом же прогоне — **PASS**; новый
server smoke не вызвал регрессий в production-like browser preview. Server unit
профиль отдельно подтверждён как **290/1048**, integration — **14/63**.
21–30. `[~]` Local MVP evidence обновлено, но canonical V2-MVP-09 и внешний
pilot readiness не переводятся автоматически в `[x]`: нужны clean published SHA,
staging/production replay, real devices и owner/manual acceptance.

## Порция 407 (07.09.2026) — signed URL private response policy repair

1–10. `[x]` Исправлен production media preflight: его `GetObjectCommand`
теперь подписывает тот же private response contract, что и runtime adapter —
`inline`, `application/octet-stream` и `private, no-store`. Ранее harness
требовал `response-cache-control`, но сам его не добавлял в подписываемую команду.
11–20. `[x]` Добавлена regression на Bucket/Key, private content type,
inline disposition и no-store cache policy; targeted media suite — **7/7 PASS**,
server build/lint/diff и полный backend unit — **290/1049 PASS**.
21–30. `[~]` Локальный signed-URL contract стал самосогласованным, но пункт 65
остаётся частичным: фактическая S3/ClamAV promotion, signed fetch, expiry,
partial failure и deletion replay требуют внешнего bucket/infra evidence.

## Порция 408 (07.09.2026) — deletion retention idempotency replay

1–10. `[x]` Docker PostgreSQL fixture из `account-deletion-autocare.integration`
проверяет полный synthetic purge: private attachments/media, outbox,
bonus/membership/invitation rows, provider suspension, cabinet privacy и
account-deletion SQL invariants.
11–20. `[x]` Добавлена повторная terminal `Completed` mutation после первого
purge; targeted integration — **1/1 PASS**, повторная карта invariants снова
имеет только zero counters. Это подтверждает идемпотентность без повторного
удаления чужих/уже отсутствующих объектов.
21–30. `[~]` Локальная PostgreSQL/storage часть усилена, но пункт 69 остаётся
partial до staging restore, real storage failure/rollback, retention scheduler
и operational deletion evidence.

## Порция 403 (07.09.2026) — final local MVP gate replay

1–10. `[x]` Свежий `npm run check:local-mvp` завершён с результатом **all
local MVP checks passed**: lint, frontend tests, Next production build,
backend build, API parity, security/media/backup contracts, route inventories,
SEO budgets и Chromium responsive matrix.
11–20. `[x]` В одном комплексном прогоне подтверждены все автоматические
проверки, включая React Router compatibility, legacy/payment guards,
transition concurrency, PWA/SEO и responsive browser matrix.
21–30. `[~]` Это подтверждение локального репозитория на текущем рабочем
дереве; canonical pilot readiness остаётся ограниченной внешними Redis,
PostgreSQL, SMTP/S3, staging и real-participant gates.

## Порция 409 (07.09.2026) — post-push unit and plan-contract verification

1–10. `[x]` После публикации commit `43087ae` рабочее дерево повторно
проверено как clean. `npm test -- --run` завершён с результатом **151 test
files / 480 tests PASS**.

11–20. `[x]` `npm run test:server:unit` завершён с результатом **290 test files /
1049 tests PASS**; ожидаемые Redis-unavailable записи относятся к
fail-closed unit coverage и не являются ошибками suite. Оба autonomous-plan
contract checks также PASS: **93 complete / 7 partial** и **100/100**.

21–30. `[~]` Свежая локальная сверка усиливает воспроизводимость кода и
документации, но не подменяет staging/production, deployed-URL, participant,
device, owner или manual acceptance evidence; 7 partial остаются без изменения.

## Порция 410 (07.09.2026) — staging probe OpenAPI endpoint correction

1–10. `[x]` Исправлен дефект `check-staging-api-compatibility`: endpoint
`/openapi.json` больше не ошибочно требуется внутри `document.paths`; он
проверяется отдельно как документ, а `REQUIRED_STAGING_PATHS` содержит только
API-маршруты. Добавлена отдельная regression на это разделение.

11–20. `[x]` `npm run test:staging-api` завершён **10/10 PASS**. Probe против
работающего локального real API с `REQUIRE_STAGING_API=true` вернул PASS:
OpenAPI 3.1, response SHA-256, `nosniff`, и две discovery-вариации с
`max-age=5, stale-while-revalidate=15`.

21–30. `[~]` Локальный real-API runtime теперь покрыт корректно, но это не
staging evidence: для закрытия пункта 30 нужен настоящий HTTPS staging URL,
а для остальных внешних пунктов — соответствующая инфраструктура и owner/
participant acceptance.

## Порция 411 (07.09.2026) — PostgreSQL multi-process transition smoke

1–10. `[x]` Добавлен `npm run smoke:server:postgres-transition`: два независимых
worker process используют одну временную PostgreSQL state row и `SELECT ... FOR
UPDATE`. Barrier гарантирует одновременный старт, после чего только один worker
коммитит transition, а второй получает controlled conflict.

11–20. `[x]` Свежий запуск вернул
`schemaVersion=1,status=pass,processCount=2,committedCount=1,conflictCount=1,
finalState=committed`; cleanup проверен через Docker PostgreSQL — временных
таблиц не осталось. Server build PASS, unit profile — **291/1051**.

21–30. `[~]` Это усиливает локальное PostgreSQL lock evidence для пункта 75,
но не заменяет staging matrix с реальными API-репликами, Redis/worker
interleavings и release-candidate acceptance.

## Порция 412 (07.09.2026) — post-smoke Docker integration replay

1–10. `[x]` После добавления multi-process PostgreSQL smoke повторно запущен
корневой `npm run test:server:integration`; все **14 test files / 63 tests PASS**.

11–20. `[x]` В прогоне подтверждены schema/auth/session, account deletion,
outbox/lease, owner/admin authorization, AutoCare discovery, capacity и branch
guards; smoke не оставил временных таблиц и не изменил production-like fixture
schema.

21–30. `[~]` Это усиливает локальную integration evidence, но не засчитывается
как staging/production multi-process replay, backup restore, external delivery
или participant acceptance.

## Порция 413 (07.09.2026) — real-mode asset boundary and browser spot-check

1–10. `[x]` `VITE_API_MODE=real npm run build:vite` завершён успешно; затем
`npm run check:production-fixture-leakage` просканировал весь `dist/assets` и
не нашёл `service@example.com` или demo-телефон ни в entry, ни в lazy JS.

11–20. `[x]` Chrome spot-check provider profile подтвердил визуальный shell,
список услуг, карту с видимой OpenStreetMap attribution, booking slots и
доступные actions. Synthetic contact data в этом окне приходит из MSW/mock
режима и не является real API или production evidence.

21–30. `[~]` Deployed artifact inventory, real API/staging URL, Lighthouse,
real-device assistive technology и owner acceptance остаются внешними gates;
локальный asset scan их не заменяет.

## Порция 414 (07.09.2026) — Vite ESM config warning removal

1–10. `[x]` В `vite.config.ts` заменён CommonJS-style `__dirname` на
ESM-native `import.meta.dirname` и нормализован `node:path` import. Это
соответствует текущему Node 24 runtime и будущему Vite native config loader.

11–20. `[x]` Повторный `VITE_API_MODE=real npm run build:vite` завершён без
прежнего `configLoader: native` warning; production fixture-leakage scan снова
PASS, `git diff --check` PASS.

21–30. `[~]` Исправление устраняет локальный build/config debt, но не меняет
внешние staging/production gates и readiness denominator.

## Порция 415 (07.09.2026) — CI real-mode artifact boundary

1–10. `[x]` В `.github/workflows/quality.yml` после Next build добавлены
`VITE_API_MODE=real npm run build:vite` и
`npm run check:production-fixture-leakage`. Тем самым CI воспроизводит уже
проверенный локальный real-mode asset boundary, а не проверяет только Next
production artifact.

11–20. `[x]` После изменения локально повторены real-mode Vite build,
fixture-leakage scan и `git diff --check`; все PASS. Workflow diff не содержит
непроверенных runtime secrets или staging-зависимостей.

21–30. `[~]` Это закрывает CI gap вокруг PWA/compatibility bundle, но не даёт
deployed URL, Lighthouse, staging API, private S3 или ручной device/owner
acceptance evidence; readiness остаётся **96.5% (193/200)**.

## Порция 416 (07.09.2026) — CI PostgreSQL transition smoke

1–10. `[x]` Backend Quality job дополнен шагом
`npm run smoke:autocare-postgres-transition` в сервисном PostgreSQL-контейнере.
Теперь multi-process lock/conflict contract проверяется не только в локальном
handoff, но и на CI runner.

11–20. `[x]` Локальный повтор root smoke вернул
`status=pass,processCount=2,committedCount=1,conflictCount=1,finalState=committed`;
workflow YAML parse и `git diff --check` также PASS.

21–30. `[~]` CI replay усиливает regression protection, но не является
staging matrix с двумя API-репликами, Redis outage/reconnect или
release-candidate acceptance; readiness остаётся **96.5% (193/200)**.

## Порция 417 (07.09.2026) — canonical local MVP replay on published SHA

1–10. `[x]` На опубликованном `2201da15f186` повторён полный
`npm run check:local-mvp`; команда завершилась с `exit=0`. Все **43 проверки**
прошли, включая frontend lint/tests, Next production build, backend build,
API/media/backup/security contracts и regressions.

11–20. `[x]` Runtime часть также PASS: временный Next production server был
поднят на loopback-порту, а responsive Chromium matrix завершила **PASS**.
Отдельный `--static-only` намеренно оставляет responsive gate manual и не
использовался как итоговый результат.

21–30. `[~]` Свежий clean local replay подтверждает текущий опубликованный
SHA, но не даёт staging API/Redis, private S3, deployed Lighthouse, real-device
или owner/participant evidence; readiness остаётся **96.5% (193/200)**.

## Порция 418 (07.09.2026) — production dependency audit replay

1–10. `[x]` Повторены обе команды из Quality workflow:
`npm audit --omit=dev --audit-level=high` в корне и в `server/`. Frontend и
backend dependency trees вернули **0 vulnerabilities**.

11–20. `[x]` Это подтверждает текущий published dependency surface на уровне
порогов CI; результат не получен за счёт снижения audit severity и не требует
изменений lockfile.

21–30. `[~]` Dependency audit не закрывает внешние staging/production runtime,
private S3, deployed Lighthouse или manual/participant acceptance gates;
readiness остаётся **96.5% (193/200)**.

## Порция 419 (07.09.2026) — provider profile accessibility-tree replay

1–10. `[x]` В Chrome на локальном маршруте
`/services/api-proservice-moscow` подтверждены заголовки профиля, CTA
`Выбрать и записаться` и `Уточнить стоимость`, список из **18 услуг**, gallery
controls и booking section со слотами.

11–20. `[x]` Accessibility tree также показывает language/theme controls,
profile navigation, legal/footer links, help action и карту с видимой
OpenStreetMap attribution. В профиле нет показанного runtime error state,
который был на отдельном discovery screenshot.

21–30. `[~]` Это read-only local synthetic/mock replay; контакты и provider data
не являются real API evidence. Pixel-level owner sign-off, real devices,
deployed URL и production/staging behavior остаются внешними gates; readiness
остаётся **96.5% (193/200)**.

## Порция 420 (07.09.2026) — named provider map region

1–10. `[x]` `ProviderLocationMap` получил `role="region"` и локализованный
`aria-label` (`Карта расположения сервиса` / `Service location map`). Это
устраняет обнаруженный accessibility gap без изменения визуального layout,
Leaflet tile policy или внешней ссылки `Смотреть на карте`.

11–20. `[x]` После изменения прошли frontend lint без warnings, **151/480**
frontend tests и Next production build; TypeScript принял обе translation keys.

21–30. `[~]` Исправление подтверждено локально и не закрывает real-device
assistive technology, deployed URL или owner acceptance; readiness остаётся
**96.5% (193/200)**.

## Порция 424 (07.09.2026) — post-owner-map canonical local MVP replay

1–10. `[x]` На опубликованном `e03d0a34eec3` повторён полный
`npm run check:local-mvp`; `exit=0`, все **43 проверки** PASS, включая
frontend/backend builds, API/media/backup/security contracts, route and
interaction regressions.

11–20. `[x]` Ephemeral Next production server и responsive Chromium matrix также
завершились PASS; protected map a11y change не вызвал layout/runtime regression.

21–30. `[~]` Local replay усиливает доказательство protected UI, но не закрывает
real-device assistive technology, deployed runtime или внешние pilot gates;
readiness остаётся **96.5% (193/200)**.

## Порция 423 (07.09.2026) — protected owner map accessibility

1–10. `[x]` `OwnerAutoCareProviderMap` получил `role="region"` и локализованный
`aria-label` (`Карта моих автосервисов` / `Map of my auto services`). Leaflet
markers, fallback coordinates, tile policy и layout не изменялись.

11–20. `[x]` После изменения прошли frontend lint без warnings, **151/480**
frontend tests и Next production build; TypeScript принял обе translation keys.

21–30. `[~]` Protected local UI contract усилен, но real owner/device
assistive-technology acceptance, deployed runtime и внешние pilot gates не
закрыты; readiness остаётся **96.5% (193/200)**.

## Порция 422 (07.09.2026) — rendered HTTP SEO replay

1–10. `[x]` `npm run check:seo -- --url http://127.0.0.1:3000 --json`
проверил локальный HTTP-rendered server: public routes, query-aware
`/services?service=oil-change`, 3 provider routes и private routes вернули
HTTP 200 с ожидаемыми title/description/canonical/Open Graph/Twitter и robots
политиками.

11–20. `[x]` Все repository budgets, prerender, image assets, locale coverage и
local HTML metadata checks также PASS; remote URL safety contract PASS.

21–30. `[~]` `Production Lighthouse` честно остаётся manual: локальный server
не является deployed URL, а Lighthouse CLI отсутствует. Пункт 94 поэтому не
переводится в полное `[x]`; readiness остаётся **96.5% (193/200)**.

## Порция 421 (07.09.2026) — post-a11y canonical local MVP replay

1–10. `[x]` После named-map-region fix повторён полный
`npm run check:local-mvp` на SHA `2af350756dd6`; команда завершилась с
`exit=0`. Все **43 проверки** PASS: lint/tests/builds, API/media/backup,
security, route, interaction и legacy contracts.

11–20. `[x]` Runtime/browser часть также PASS: Next production server поднят
на ephemeral loopback-порту, responsive Chromium matrix завершена PASS.

21–30. `[~]` Replay подтверждает текущий опубликованный код в local
production-like среде, но не закрывает staging/production, real-device,
deployed Lighthouse или owner/participant evidence; readiness остаётся
**96.5% (193/200)**.

## Порция 425 (07.09.2026) — localized and functional map controls

1–10. `[x]` `AutoCareHeroMap` получил доступное имя, локализованные zoom
labels и реальные `onClick`-действия с bounded visual zoom **100–120%**;
кнопки корректно disabled на границах, а текущий масштаб объявляется через
`aria-live`. Static hero artwork и provider markers остаются synthetic visual
surface без claims о real tile data.

11–20. `[x]` `AutoCareMapPreview` больше не содержит hardcoded English
`Zoom in/out`: controls используют translation keys. Interaction contract был
обновлён под этот локализованный API. Targeted interaction check и **2/2** его
regression tests PASS; translation coverage **9/9**, lint без warnings,
frontend **151/480**, Next production build и полный `check:local-mvp` PASS,
включая responsive Chromium matrix.

21–30. `[~]` Commit `2a4955bd82ef` опубликован по цепочке
`feature → dev → main`. Это закрывает локальный map a11y/interaction gap, но
не превращает synthetic hero surface в deployed map evidence и не закрывает
staging/production, real-device, Lighthouse или owner/participant gates;
readiness остаётся **96.5% (193/200)**.

## Порция 426 (07.09.2026) — AutoCare locale consistency replay

1–10. `[x]` В публичной форме поиска `5/10/25 км` заменены на
`autocare.radiusOption`; badges профиля сервиса (`mobile service` и
`pickup/delivery`) больше не содержат русские literals и форматируют радиус
через выбранную locale. Исправлены EN/RU, popular locales и European locale
family overrides.

11–20. `[x]` Добавлена regression-проверка, что public automotive journey
copy, map labels, service badges и radius labels не используют English fallback
для поддерживаемых locale loaders. Translation coverage — **9/9 PASS**;
frontend lint без warnings, полный frontend unit — **151/480 PASS**, Next и
backend builds PASS. На commit `26a3cad99fbe` полный `check:local-mvp` завершён
с `all local MVP checks passed`, включая accessibility, security contracts и
responsive Chromium matrix.

21–30. `[~]` Это закрывает локальный translation/a11y gap публичного AutoCare
journey, но не заменяет real-device language review, staging/production
runtime, deployed Lighthouse или pilot evidence; readiness остаётся
**96.5% (193/200)**.

## Порция 427 (07.09.2026) — locale-aware home provider preview

1–10. `[x]` Домашний provider preview больше не выводит расстояния из
русских fixture strings и не заменяет `Today/Tomorrow` на русский независимо
от locale. `Intl.NumberFormat` форматирует километры, а
`Intl.RelativeTimeFormat` форматирует ближайший слот; обработаны и
`Today/Tomorrow` API values, и русские fallback fixtures.

11–20. `[x]` Lint без warnings, Next production build с TypeScript PASS; полный
`check:local-mvp` на commit `6f8d11911ddd` завершён с `all local MVP checks
passed`, включая frontend **151/480**, accessibility/interaction contracts,
security/API regressions и responsive Chromium matrix.

21–30. `[~]` Исправление усиливает локальный multilingual UX, но не является
real-device language review и не закрывает staging/production, deployed
Lighthouse или pilot evidence; readiness остаётся **96.5% (193/200)**.

## Порция 428 (07.09.2026) — public price and review media copy localization

1–10. `[x]` Fair-price benchmark переведён с locale-ветки `ru/else` на
translation keys для заголовка, `from/up to`, типичной цены, методологии и
источника. Active price chips теперь используют `fromPrice/toPrice`, поэтому
русские `от/до` не протекают в EN и другие локали; review-photo alt также
использует существующий локализованный key.

11–20. `[x]` Translation coverage **9/9 PASS**, lint без warnings, Next и
backend TypeScript builds PASS. На commit `0c3cf5361b0d` полный
`check:local-mvp` завершён с `all local MVP checks passed`: frontend
**151/480**, API/media/backup/security/route contracts и responsive Chromium
matrix PASS.

21–30. `[~]` Локальный public-copy/a11y gap закрыт без изменения API или
данных; real-device language review, staging/production, deployed Lighthouse и
pilot evidence остаются внешними gates. Readiness остаётся
**96.5% (193/200)**.

## Порция 429 (07.09.2026) — localized home location counts

1–10. `[x]` Карточка зон на главной больше не держит английское `services` для
не-английских locale и не содержит русские существительные в компоненте.
Добавлены локализованные singular/plural keys для popular и European locale
families; для русского сохранена грамматика `автосервис / автосервиса /
автосервисов` через translation keys.

11–20. `[x]` Регрессионный translation test расширен до **10/10 PASS**;
полный frontend suite — **151/481 PASS**, lint без warnings, полный
`check:local-mvp` на commit `f3e7211fede3` завершён с `all local MVP checks
passed`, включая responsive Chromium matrix.

21–30. `[~]` Исправление закрывает ещё один локальный multilingual UX gap без
изменения API или данных. Real-device language review, staging/production,
deployed Lighthouse и pilot evidence остаются внешними gates; readiness
остаётся **96.5% (193/200)**.

## Порция 430 (07.09.2026) — localized synthetic hero offer prices

1–10. `[x]` Synthetic offer markers в hero map больше не содержат русские
`от … ₽`: цены хранятся числовыми значениями, форматируются через
`formatCurrency` и оборачиваются в локализованный `fromPrice`. Геометрия,
рейтинги, artwork и synthetic-статус визуального слоя не изменились.

11–20. `[x]` Lint без warnings и полный `check:local-mvp` на commit
`bc56583886df` завершён с `all local MVP checks passed`: frontend **151/481**,
Next/backend builds, API/media/backup/security/route contracts и responsive
Chromium matrix PASS.

21–30. `[~]` Это закрывает ещё один локальный copy/localization gap; реальные
offer data, deployed map и внешние staging/production, Lighthouse и pilot
evidence gates не затронуты. Readiness остаётся **96.5% (193/200)**.

## Порция 431 (07.09.2026) — locale-aware home provider prices

1–10. `[x]` Home provider preview теперь хранит цены fixture/API-мэппинга как
числа, а не русские display strings. Основная и зачёркнутая цена форматируются
через `formatCurrency` в выбранной locale; `fromPrice` остаётся переводимым.

11–20. `[x]` Lint без warnings и полный `check:local-mvp` на commit
`77b612d60eab` завершён с `all local MVP checks passed`: frontend **151/481**,
Next/backend builds, API/media/backup/security/route contracts и responsive
Chromium matrix PASS.

21–30. `[~]` Исправление закрывает локальный price-formatting gap без изменения
API или реальных данных. Real-device language review, staging/production,
deployed Lighthouse и pilot evidence остаются внешними gates; readiness
остаётся **96.5% (193/200)**.

## Порция 432 (07.09.2026) — localized public availability slots

1–10. `[x]` Форматирование `Today/Tomorrow` вынесено в общий
`formatAutoCareSlot`: домашний provider preview, result cards и comparison
table теперь используют выбранную locale вместо показа исходного английского
или русского значения API/fixture.

11–20. `[x]` Добавлены тесты для EN/RU/ES и неизвестного slot-формата:
targeted **5/5 PASS**, полный frontend suite — **151/482 PASS**, lint без
warnings. Полный `check:local-mvp` на commit `7b3f672ff29f` завершён с
`all local MVP checks passed`, включая responsive Chromium matrix.

21–30. `[~]` Локальный public availability gap закрыт без изменения API,
слотов или booking semantics. Real-device language review, staging/production,
deployed Lighthouse и pilot evidence остаются внешними gates; readiness
остаётся **96.5% (193/200)**.

## Порция 433 (07.09.2026) — localized public distance formatting

1–10. `[x]` Числовой `distanceKm` теперь сохраняется в discovery/API и mock
модели, а общий `formatDistanceKm` используется в result cards, comparison
table, focused map card и favorites. Старые string-only fixtures безопасно
проходят через `parseDistanceKm`; неизвестное расстояние отображается как `—`.

11–20. `[x]` Targeted model/mapper/locale suite — **3 файла / 11 тестов PASS**;
полный frontend suite — **151/483 PASS**, lint без warnings. Полный
`check:local-mvp` на commit `a458350530ed` завершён с `all local MVP checks
passed`, включая responsive Chromium matrix.

21–30. `[~]` Исправление закрывает raw-distance multilingual UX gap без изменения
API payload shape или booking semantics. Real-device language review,
staging/production, deployed Lighthouse и pilot evidence остаются внешними
gates; readiness остаётся **96.5% (193/200)**.

## Порция 434 (07.09.2026) — localized provider offering prices

1–10. `[x]` Provider profile и booking panel больше не показывают API/mock
`priceLabel` как готовую системно-локализованную строку. `ProviderOffering`
теперь сохраняет числовую цену, валюту, диапазон и `priceType`, а общий
formatter строит fixed/from/range/quote-required через выбранную locale;
legacy label остаётся безопасным fallback.

11–20. `[x]` Добавлены regression tests для API mapper и formatter: targeted
**2 файла / 6 тестов PASS**, полный frontend suite — **152/486 PASS**; lint,
Vite production build и полный `check:local-mvp` на commit `2f94a34` завершены
успешно, включая responsive Chromium matrix.

21–30. `[~]` Локализован public provider pricing surface без изменения API
payload или booking semantics. Real-device language review, staging/production,
deployed Lighthouse и pilot evidence остаются внешними gates; readiness остаётся
**96.5% (193/200)**.

## Порция 435 (07.09.2026) — localized request summary pricing and duration

1–10. `[x]` Request summary и order summary теперь используют тот же
structured price formatter, а hardcoded `Итого` заменён на `booking.total`.
Длительность предложения хранится численно и форматируется через locale-aware
minute units; диапазоны `45–60` сохраняют смысл, legacy duration/price strings
остаются fallback для старых данных.

11–20. `[x]` Добавлены regression tests для duration/price helpers и locale
formatting: полный frontend suite — **152/487 PASS**, targeted заявочный набор
**4 файла / 14 тестов PASS**, Vite production build, lint и `check:local-mvp`
на commit `3d8264b` завершены успешно, включая responsive Chromium matrix.

21–30. `[~]` Закрыт ещё один raw-copy gap в public request flow без изменения
API payload или booking semantics. Real-device language review, staging/production,
deployed Lighthouse и pilot evidence остаются внешними gates; readiness остаётся
**96.5% (193/200)**.

## Порция 436 (07.09.2026) — localized guarantee claim copy

1–10. `[x]` Guarantee claim card больше не держит RU/EN copy и fallback error
внутри компонента. Заголовок, описание, placeholder, submit/success/error copy
вынесены в `autocare.*` translation keys; русская локаль получает явный override,
остальные locale используют единый English fallback без русского протекания.

11–20. `[x]` Translation coverage и component regression проверены: targeted
**2 файла / 12 тестов PASS**, полный frontend suite — **152/488 PASS**, lint,
Vite/Next/backend builds и полный `check:local-mvp` на commit `d064edb`
завершены успешно, включая responsive Chromium matrix.

21–30. `[~]` Закрыт raw-copy localization gap в заявке без изменения API,
claim semantics или error handling. Real-device language review,
staging/production, deployed Lighthouse и pilot evidence остаются внешними
gates; readiness остаётся **96.5% (193/200)**.

## Порция 437 (07.09.2026) — localized owner provider cards

1–10. `[x]` Owner provider list больше не держит RU/EN ternaries для response
time, режимов связи, estimated price, статусов чата, CTA и toast/error copy.
Карточка использует translation contract, существующий `fromPrice` и общий
`formatCurrency`; provider-supplied name/address/warranty остаются данными
профиля, а не UI-копией.

11–20. `[x]` Translation schema, Vite production build и lint PASS; полный
`check:local-mvp` на commit `8681a9c` завершён с `all local MVP checks passed`,
включая responsive Chromium matrix. Frontend suite — **152/488 PASS**.

21–30. `[~]` Закрыт multilingual copy/number-format gap в protected owner
surface без изменения API, communication settings или mutation semantics.
Real-device language review, staging/production, deployed Lighthouse и pilot
evidence остаются внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 438 (07.09.2026) — localized owner dashboard metrics

1–10. `[x]` Owner dashboard metric grid больше не держит RU/EN copy, raw
`total/active locations` и локальное системное форматирование RUB внутри
компонента. Карточки заявок, конверсии, подтверждённых смет и рейтинга теперь
используют translation contract и общий `formatCurrency`.

11–20. `[x]` Translation schema, `git diff --check`, ESLint без warnings,
Vite production build и полный `check:local-mvp` на commit `b953ac8` завершены
успешно: все 43 проверки PASS, включая responsive Chromium matrix;
frontend suite — **152/488 PASS**.

21–30. `[~]` Закрыт multilingual copy/number-format gap в owner dashboard
metrics без изменения расчётов метрик или API semantics. Real-device language
review, staging/production, deployed Lighthouse и pilot evidence остаются
внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 439 (07.09.2026) — localized owner dashboard hero and quick actions

1–10. `[x]` Dashboard hero и quick actions больше не хранят RU/EN copy в
компонентах. Заголовок с именем владельца, описание, CTA и четыре операционных
действия используют общий translation contract; устаревший `locale` prop у
quick actions удалён после перехода на `useTranslation`.

11–20. `[x]` `git diff --check`, ESLint без warnings, Vite production build и
полный `check:local-mvp` на commit `699dd85` завершены успешно: все 43 проверки
PASS, включая responsive Chromium matrix; frontend suite — **152/488 PASS**.

21–30. `[~]` Закрыт copy-localization gap в hero/quick-actions без изменения
маршрутов, owner workflow или API semantics. Real-device language review,
staging/production, deployed Lighthouse и pilot evidence остаются внешними
gates; readiness остаётся **96.5% (193/200)**.

## Порция 440 (07.09.2026) — localized owner request queue and branch panel

1–10. `[x]` Owner request queue и branch panel больше не держат RU/EN copy в
компонентах. Заголовки, описания, статусы, empty states и CTA переведены через
translation contract; дата обновления заявки использует общий `formatDateTime`,
а type-only импорт provider отделён от value import.

11–20. `[x]` `git diff --check`, ESLint без warnings, Vite production build и
полный `check:local-mvp` на commit `5f57b25` завершены успешно: все 43 проверки
PASS, включая responsive Chromium matrix; frontend suite — **152/488 PASS**.

21–30. `[~]` Закрыт copy/date-format localization gap в двух dashboard panels
без изменения сортировки заявок, маршрутов, статусов API или provider data.
Real-device language review, staging/production, deployed Lighthouse и pilot
evidence остаются внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 441 (07.09.2026) — localized owner analytics and broadcast panels

1–10. `[x]` Analytics card и broadcast panel переведены на typed translation
keys. Analytics использует общий locale formatter для минут, рейтинга,
счётчиков и retention days; broadcast сохраняет прежние offer mutation и
error semantics, но больше не держит локальный RU/EN copy object.

11–20. `[x]` Targeted broadcast regression — **1/1 PASS**; после обновления
translation mock полный `check:local-mvp` на commit `9655361` завершён с
`all local MVP checks passed`, включая responsive Chromium matrix; frontend
suite — **152/488 PASS**.

21–30. `[~]` Закрыт copy/number-format gap в analytics и broadcast surfaces
без изменения API payloads или mutation semantics. Real-device language review,
staging/production, deployed Lighthouse и pilot evidence остаются внешними
gates; readiness остаётся **96.5% (193/200)**.

## Порция 442 (07.09.2026) — localized owner fleet panel and vehicle form

1–10. `[x]` Fleet panel, responsive vehicle table и add-vehicle form больше не
держат локальный RU/EN copy object. Заголовки, labels, placeholders, table
aria-label, submit/toast copy используют translation contract; locale по-прежнему
принимается из i18n context для brand labels и payload semantics.

11–20. `[x]` Targeted fleet regression — **2 файла / 3 теста PASS**; полный
`check:local-mvp` на commit `1499b63` завершён с `all local MVP checks passed`,
включая responsive Chromium matrix; frontend suite — **152/488 PASS**.

21–30. `[~]` Закрыт protected fleet copy-localization gap без изменения fleet
mutation, draft persistence или vehicle snapshot shape. Real-device language
review, staging/production, deployed Lighthouse и pilot evidence остаются
внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 443 (07.09.2026) — localized provider documents and customer contact

1–10. `[x]` В owner provider creation form блоки документов и customer contact
больше не используют locale ternaries. Заголовки, описания, labels,
placeholders, remove aria-label и booking/chat options переведены через typed
translation contract; upload, draft и create-provider semantics не изменены.

11–20. `[x]` Provider form regression — **1 файл / 3 теста PASS**; полный
`check:local-mvp` на commit `23ca2e8` завершён с `all local MVP checks passed`,
включая responsive Chromium matrix; frontend suite — **152/488 PASS**.

21–30. `[~]` Закрыт raw-copy localization gap в provider onboarding без изменения
валидации, media pipeline или communication mode values. Real-device language
review, staging/production, deployed Lighthouse и pilot evidence остаются
внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 444 (07.09.2026) — localized provider evidence and onboarding panels

1–10. `[x]` Evidence и onboarding panels в provider details переведены через
typed translation keys. Loading/error/empty states, evidence statuses,
verification checks, cancel actions и request labels больше не зависят от raw
RU/EN ternaries; даты используют общий `formatDateTime`.

11–20. `[x]` Onboarding regression — **1 файл / 3 теста PASS**; полный
`check:local-mvp` на commit `a4f5551` завершён с `all local MVP checks passed`,
включая responsive Chromium matrix; frontend suite — **152/488 PASS**.

21–30. `[~]` Закрыт localization/date-format gap в moderation/onboarding UI без
изменения verification, cancellation или profile-update mutations. Real-device
language review, staging/production, deployed Lighthouse и pilot evidence
остаются внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 445 (07.09.2026) — localized provider communication settings

1–10. `[x]` Communication settings form больше не использует raw RU/EN
ternaries. Labels, select options, switch descriptions, public note и save
states используют typed translation contract; communication payload и mutation
semantics unchanged.

11–20. `[x]` Targeted communication regression — **1 файл / 1 тест PASS**;
полный `check:local-mvp` на commit `c5a123d` завершён с
`all local MVP checks passed`, включая responsive Chromium matrix; frontend
suite — **152/488 PASS**.

21–30. `[~]` Закрыт raw-copy localization gap в contact/booking settings
без изменения API payload или mutation semantics. Real-device language review,
staging/production, deployed Lighthouse и pilot evidence остаются внешними
gates; readiness остаётся **96.5% (193/200)**.

## Порция 446 (07.09.2026) — localized provider profile change form

1–10. `[x]` Profile change form больше не держит локальный RU/EN copy-object
или locale prop. Поля публичного профиля, multibrand, документы, private
reference placeholder и submit action используют typed translation contract;
draft restoration, document payload и profile-update semantics unchanged.

11–20. `[x]` Profile/onboarding regression — **2 файла / 4 теста PASS**;
ESLint, Vite production build и полный `check:local-mvp` на profile-localization
worktree поверх `87705b6` завершены с `all local MVP checks passed`, включая
responsive Chromium matrix; frontend suite — **152/488 PASS**.

21–30. `[~]` Закрыт raw-copy localization gap в profile-change surface без
изменения draft persistence, validation или mutation payload. Real-device
language review, staging/production, deployed Lighthouse и pilot evidence
остаются внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 447 (07.09.2026) — localized provider members panel

1–10. `[x]` Members panel больше не держит локальный copy-object или locale
prop. Заголовки, роли, состояния membership/invitation, loading/error/retry,
invite/revoke feedback и action aria-labels используют typed translation
contract; provider/location scopes и mutation semantics unchanged.

11–20. `[x]` Members regression — **1 файл / 3 теста PASS**; полный
`check:local-mvp` на profile-members worktree поверх `c7e9edc` завершён с
`all local MVP checks passed`, включая responsive Chromium matrix; frontend
suite — **152/488 PASS**.

21–30. `[~]` Закрыт raw-copy localization gap в team-access surface без
изменения invite/revoke permissions, query shape или provider scope. Real-device
language review, staging/production, deployed Lighthouse и pilot evidence
остаются внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 448 (07.09.2026) — localized provider bonus and liability panel

1–10. `[x]` Bonus/liability panel переведён на typed translation keys: loading,
error/retry, metrics, manual grant form, validation, grant feedback, entry
types и empty state. Даты переведены на общий `formatDateTime`; bonus grant
payload, provider/client scope и idempotency key semantics unchanged.

11–20. `[x]` Bonus regression — **1 файл / 1 тест PASS**; полный
`check:local-mvp` на bonus-localization worktree поверх `86c13e9` завершён с
`all local MVP checks passed`, включая responsive Chromium matrix; frontend
suite — **153/489 PASS**.

21–30. `[~]` Закрыт raw-copy/date-format localization gap в bonus surface без
изменения validation helper, grant mutation или liability query shape.
Real-device language review, staging/production, deployed Lighthouse и pilot
evidence остаются внешними gates; readiness остаётся **96.5% (193/200)**.

## Порция 449 (07.09.2026) — localized restricted provider access state

1–10. `[x]` Restricted-access branch в provider details page больше не содержит
RU/EN ternary. Сообщение о доступе переведено через typed translation contract;
workspace scope lookup и owner permission check не изменены.

11–20. `[x]` Полный `check:local-mvp` на access-localization worktree поверх
`131e138` завершён с `all local MVP checks passed`, включая responsive
Chromium matrix; ESLint и frontend suite — **153/489 PASS**.

21–30. `[~]` Закрыт последний raw-copy gap в restricted branch provider details
без изменения authorization semantics. Real-device language review,
staging/production, deployed Lighthouse и pilot evidence остаются внешними
gates; readiness остаётся **96.5% (193/200)**.
