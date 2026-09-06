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
