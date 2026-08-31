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
