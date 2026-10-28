# Encryption backfill rollout — N09

## Broadcast offer binding expansion

New `autocare_broadcast_offers.offerSnapshot` writes receive an HMAC over plaintext, offer UUID, broadcast request UUID, provider UUID and location UUID. Migration `1786760000000` adds a nullable binding and a durable checkpoint. Client account deletion reseals a redacted snapshot for each offer. API responses omit the binding.

After old writers have drained and a tested backup and approved KMS keyring are available:

1. Apply migration `1786760000000`. Run `npm --prefix server run encryption:backfill-broadcast-offer-binding -- --mode apply --batch-size 100 --max-batches 100` until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any mismatch or incomplete scan blocks cutover. Compare-write checks scope, ciphertext and binding.
3. If old writers were active, coordinate `--mode reset`, then repeat apply and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy `DATA_ENCRYPTION_REQUIRE_BROADCAST_OFFER_RECORD_BINDING=true` to all API/worker instances. Rehearse offer creation/list, account deletion and backup restore. Partial reads selecting offerSnapshot need its binding plus offer/broadcast/provider/location scope.


## Broadcast request binding expansion

New `autocare_broadcast_requests.issueDescription` and non-null `vehicleSnapshot` writes receive separate HMACs over plaintext, broadcast UUID, client UUID and service definition UUID. `marketId` is excluded because its foreign key sets it to null when a market is deleted. Migration `1786750000000` adds nullable bindings and a durable checkpoint. Account deletion reseals redacted issue per row and clears snapshot with its binding. API responses omit bindings.

After old writers have drained and a tested backup and approved KMS keyring are available:

1. Apply migration `1786750000000`. Run `npm --prefix server run encryption:backfill-broadcast-request-binding -- --mode apply --batch-size 100 --max-batches 100` until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any mismatch or incomplete scan blocks cutover. Compare-write checks scope, ciphertext and both bindings.
3. If old writers were active, coordinate `--mode reset`, then repeat apply and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy `DATA_ENCRYPTION_REQUIRE_BROADCAST_REQUEST_RECORD_BINDING=true` to all API/worker instances. Rehearse create/list, account deletion and backup restore. Partial reads selecting a protected field need its binding plus broadcast/client/definition scope.


## Repair event binding expansion

New `autocare_repair_events.title`, non-null `notes` and `metadata` writes receive separate HMACs over plaintext, event UUID, request UUID and eventType. Migration `1786740000000` adds nullable bindings and a durable checkpoint. Account deletion reseals redacted title and metadata per row and clears notes with its binding. API responses omit bindings.

After old writers have drained and a tested backup and approved KMS keyring are available:

1. Apply migration `1786740000000`. Run `npm --prefix server run encryption:backfill-repair-event-binding -- --mode apply --batch-size 100 --max-batches 100` until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any mismatch or incomplete scan blocks cutover. Compare-write checks scope, ciphertext and all three bindings.
3. If old writers were active, coordinate `--mode reset`, then repeat apply and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy `DATA_ENCRYPTION_REQUIRE_REPAIR_EVENT_RECORD_BINDING=true` to all API/worker instances. Rehearse event creation/list, account deletion and backup restore. Partial reads selecting a protected field need its binding plus event/request scope.


## Catalog gap request binding expansion

New `autocare_catalog_gap_requests.labels`, `comparisonAttributes`,
`rationale` and non-null `reviewReason` writes receive separate HMACs over
plaintext, gap UUID, requester UUID, nullable provider UUID, proposed/category
slugs and price type. Migration `1786730000000` adds nullable bindings and a
durable checkpoint. Account deletion reseals the three required redacted
fields per row and clears review reason with its binding. API responses omit
bindings.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786730000000`. Run
   `npm --prefix server run encryption:backfill-catalog-gap-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any
   mismatch or incomplete scan blocks cutover. Compare-write checks the full
   scope, ciphertext and all four bindings.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_CATALOG_GAP_RECORD_BINDING=true` to all API/worker
   instances. Rehearse create/decision/list, account deletion and backup
   restore. Partial reads selecting a protected field need its binding and
   gap/requester/provider/slugs/priceType scope.

## Appeal text binding expansion

New `autocare_appeals.reason` and non-null `decisionReason` writes receive
HMACs over plaintext, appeal UUID, subject, subject UUID, submitter UUID and
nullable provider UUID. Migration `1786720000000` adds nullable bindings and
a durable checkpoint. Account deletion reseals each redacted reason with its
own MAC; decision reason and binding are cleared together. API responses omit
bindings.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786720000000`. Run
   `npm --prefix server run encryption:backfill-appeal-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any
   mismatch or incomplete scan blocks cutover. Compare-write checks subject,
   all scope UUIDs, ciphertext and both bindings.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_APPEAL_RECORD_BINDING=true` to all API/worker
   instances. Rehearse create/decision/withdraw/list, account deletion and
   backup restore. Partial reads selecting either text need the corresponding
   binding plus appeal/subject/submitter/provider scope.

## Provider change request binding expansion

New `autocare_provider_change_requests.payload` and non-null `reviewReason`
writes receive HMACs over plaintext, request UUID, provider UUID, requester
UUID and kind. Migration `1786710000000` adds nullable bindings and a durable
checkpoint. Account deletion reseals each redacted payload with its own MAC;
review reason and binding are cleared together. API responses omit bindings.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786710000000`. Run
   `npm --prefix server run encryption:backfill-provider-change-request-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any
   mismatch or incomplete scan blocks cutover. Compare-write checks scope
   UUIDs, kind, ciphertext and both bindings.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_PROVIDER_CHANGE_REQUEST_RECORD_BINDING=true` to all
   API/worker instances. Rehearse create/decision/cancel/list, account deletion
   and backup restore. Partial reads selecting payload or reason must include
   the corresponding binding and full request/provider/requester/kind scope.

The published `1786410000000` migration is immutable. It loads entire columns
and identities in one transaction and is unsuitable for an unmeasured large
legacy database. Do not rewrite its checksum, run it blindly on real data,
re-encrypt h1 indexes during KEK rotation, or retire historical keys/backups.

The bounded engine `bounded-backfill.ts` provides keyset iteration (≤500 rows),
explicit run budgets, durable checkpoints through an atomic adapter, failure
propagation and restart. It never selects a production key provider, logs row
values, or connects to a database. It is preparation, not a production migration.

## Production key provider (U01 code path)

The API, worker and TypeORM migration data source now decrypt the same keyring
through AWS KMS before accessing encrypted fields. Set
`DATA_ENCRYPTION_AWS_KMS_REGION`, `DATA_ENCRYPTION_AWS_KMS_KEY_ID` (a fixed key ARN),
and `DATA_ENCRYPTION_AWS_KMS_KEYRING` (base64 KMS ciphertext) on every process.
The AWS SDK credential chain must grant `kms:Decrypt` for this key and the
`application=autocare-hub`, `purpose=field-encryption-keyring`, `version=1`
encryption context. A missing setting, invalid blob, KMS denial or 15-second
Decrypt timeout stops startup.
The local keyring remains development/test only.

For a **new empty database only**, an operator with `kms:Encrypt` may run
`npm run encryption:provision-keyring` in `server/` after setting the region and
key ARN. Capture the emitted ciphertext in the deployment secret store and an
access-controlled recovery copy. Use that exact blob for API, worker, migrations
and restore. Do not rerun provisioning for an existing encrypted database:
the new random KEK and HMAC key would make old ciphertext and indexes unreadable.
For an existing database, wrap its approved existing keyring under KMS in a
controlled migration instead. Do not place plaintext keys or the ciphertext
blob in Git, logs, build arguments or support tickets. Runtime identities need
Decrypt; provisioning credentials need Encrypt and should not be installed in
the API/worker. Test denial, restart, migration and backup restore in staging
before enabling real data. This code path has no live AWS KMS acceptance yet.

Before wiring a DB backfill adapter, finish U02 envelope scope/version and
verify the production KMS provider against the deployment and recovery path.
The approved rollout must implement:

1. Expand nullable versioned shadow ciphertext/index columns through a new additive
   migration; keep published history unchanged. Deploy dual reads/writes under a
   documented cutover flag. Inventory old/new counts without revealing values.
2. Read UUID keysets in bounded batches with source version and row/parent scope;
   transform with the approved provider. Commit compare-and-swap updates and the
   checkpoint together in one short transaction. A changed/deleted source row
   retries without advancing the checkpoint; reruns cannot rewrite a new version.
3. Verify full coverage, nulls, identity↔HMAC uniqueness, authorization, outbox,
   snapshots, partial selects and negative envelope swaps. Measure memory/locks,
   WAL/replication lag and interruption/restart at production-like volume.
4. Switch reads only after approved verification. Retain old columns and key IDs
   for rollback through the agreed recovery window. Prove AEAD backup/restore
   with both historical and new keys before any separate plaintext/key retirement.

An exhausted iterator is not cutover approval: concurrent writes, indexes and
restore must be independently verified. HMAC index-key rotation requires a separate
versioned index migration; replacing only a KEK must preserve h1 uniqueness.
Full production backfill rollout remains pending U02 and isolated DB
scale/recovery evidence. No current database or historical archive was touched.

## User and invitation email binding expansion

New email writes contain a record binding MAC while old readers can still read
the envelope. Migration `1786470000000` adds a durable checkpoint table; it
does not rewrite identity rows. The operator command adds a MAC to existing
authenticated email envelopes without changing their DEK or blind index. Its
compare-write update and checkpoint advance share one transaction per batch.
It prints progress counts and no plaintext. This covers only `users.email` and
`autocare_provider_invitations.email`, not the remaining U02 fields.

After old API/worker instances have drained, the approved keyring is available
to the migration and command, and a tested backup exists:

1. Apply the new migration. For each of `users` and
   `autocare_provider_invitations`, run
   `npm --prefix server run encryption:backfill-email-binding -- --table users --mode apply --batch-size 100 --max-batches 100`
   (substitute the invitation table for the second run). Repeat until the
   command reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` for each table. It authenticates
   every email envelope against row/provider ID and blind index. A successful
   full pass reports `exhausted:true`; failure or budget exhaustion blocks
   cutover. Use a budget large enough for a full pass without exceeding the
   approved database window.
3. If an old writer was observed during the scan, run `--mode reset` for that
   table, repeat apply and verify after it has drained. Reset removes only
   progress metadata, not ciphertext. Coordinate this operation so no other
   backfill process is active.
4. Only after a complete verify, deploy
   `DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING=true` to every API/worker
   instance. Any missing or altered binding then fails reads. Rehearse login,
   invitations, account deletion, key rotation and backup restore. Reverting
   the flag temporarily restores legacy reads; do not remove key material.

This cutover requires staging evidence with the real KMS keyring, production
data scale/lock measurements and a restore rehearsal. The command and CI tests
alone are not approval to enable strict mode on live data. Other encrypted
fields and non-recipient outbox content still need the wider U02 rollout above.

## OAuth provider subject binding expansion

New `oauth_identities.provider_subject_ciphertext` envelopes carry a MAC over
the identity UUID, user UUID and provider (`google` or `yandex`). Reads verify
that MAC and the existing HMAC blind index. Existing envelopes remain readable
during expansion. Migration `1786490000000` adds a durable checkpoint table
without modifying identity rows. The operator command reads UUID keysets of at
most 500 identities. It authenticates the old ciphertext and blind index,
adds a record MAC without changing the DEK, then compare-writes the ciphertext
and advances the checkpoint in one transaction. It prints counts only.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786490000000`. Run
   `npm --prefix server run encryption:backfill-oauth-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   complete pass. It checks every row against identity UUID, user UUID,
   provider and blind index. Budget exhaustion or authentication failure blocks
   cutover.
3. If an old writer was active during the scan, run `--mode reset`, repeat
   apply and verify after it has drained. Reset removes only progress metadata;
   coordinate it so no other backfill process is running.
4. Only after successful staging KMS/restore and complete verification, deploy
   `DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING=true` to every API/worker.
   Rehearse OAuth login, link/unlink, key rotation and restore. Reverting this
   switch temporarily restores legacy reads; retain the historical keys.

This code and CI are preparation, not production acceptance. Other encrypted
fields still require the wider U02 rollout.

## User name and phone binding expansion

New `users.name` and non-null `users.phone` writes carry companion HMACs in
`nameBinding` and `phoneBinding`. The MAC covers the decrypted value, field
name and user UUID, so moving an authenticated ciphertext between users fails
ORM reads. Migration `1786500000000` adds nullable bindings and a durable
checkpoint. The command reads UUID keysets of at most 500 users, authenticates
the existing AES-GCM values and any MACs, then compare-writes missing bindings
with checkpoint progress in one transaction. It prints counts only.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786500000000`. Run
   `npm --prefix server run encryption:backfill-user-profile-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   complete pass. It authenticates each name and non-null phone against its
   user UUID. Budget exhaustion or mismatch blocks cutover.
3. If an old writer was active during the scan, use `--mode reset`, then
   repeat apply and verify after it has drained. Reset removes only progress
   metadata; coordinate it so no other backfill process is running.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING=true` to all API/worker
   instances. Rehearse registration, OAuth login, account deletion and backup
   restore. Queries selecting `users.name` must also select `nameBinding`;
   current owner/bonus user projections do. Reverting the flag
   temporarily restores legacy reads; retain old keys throughout the recovery
   window.

This does not cover other encrypted user columns or the remaining U02 fields.

## Private message body binding expansion

New non-null `autocare_service_messages.body` writes carry a companion HMAC in
`bodyBinding`. The MAC covers the decrypted body, column, message UUID,
request/thread UUIDs, sender UUID and message kind; ORM reads reject ciphertext moved to a
different message row or an unencrypted access-control link changed. A null body
has a null binding. Migration `1786510000000` adds the nullable
binding and a durable checkpoint. The operator command reads UUID keysets of
at most 500 messages, authenticates AES-GCM and existing MACs, then
compare-writes missing bindings with checkpoint progress in one transaction.
It prints counts only and never logs message contents.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786510000000`. Run
   `npm --prefix server run encryption:backfill-message-body-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   complete pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   also checks that the request/thread and sender links and kind have not changed.
3. If old writers were active during the scan, coordinate `--mode reset`, then
   repeat apply and verify after they have drained. Reset removes only the
   progress checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING=true` to all API/worker
   instances. Rehearse private chat, request conversation, read receipts,
   message deletion, account deletion/export and backup restore. Queries that
   select `body` must also select `bodyBinding`; current chat reads load the
   full entity. Keep old keys during the recovery window.

## Encrypted service offer binding expansion

New non-null `autocare_service_messages.offer` writes carry a companion HMAC
in `offerBinding`. The MAC covers the decrypted JSON, column, message UUID,
request/thread UUIDs, sender UUID and message kind. ORM reads reject ciphertext
moved between messages or changed access-control links. A null offer has a null
binding. Migration `1786520000000` adds the nullable binding and a durable
checkpoint. The operator command reads UUID keysets of at most 500 messages,
authenticates AES-GCM and existing MACs, and compare-writes missing bindings
with checkpoint progress in one transaction. It prints counts only.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786520000000`. Run
   `npm --prefix server run encryption:backfill-message-offer-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks the request/thread and sender links and kind.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING=true` to all API/worker
   instances. Rehearse creating, reading, accepting and declining offers,
   message deletion, account deletion/export and backup restore. Queries that
   select `offer` must also select `offerBinding`. Keep old keys during the
   recovery window.

## Private chat subject binding expansion

New `autocare_chat_threads.subject` writes carry a companion HMAC in
`subjectBinding`. The MAC covers the decrypted subject, thread UUID, type,
request/provider/client/creator UUIDs. ORM reads reject a moved ciphertext or
changed access-control link. Migration `1786530000000` adds the nullable
binding and a durable checkpoint. The operator command reads UUID keysets of
at most 500 threads, authenticates AES-GCM and existing MACs, then
compare-writes missing bindings with checkpoint progress in one transaction.
It prints counts only. Account deletion rebinds each redacted subject after
clearing client/creator links.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786530000000`. Run
   `npm --prefix server run encryption:backfill-chat-subject-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks the thread type and all access links.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING=true` to all API/worker
   instances. Rehearse chat creation/list/read, messages/read receipts,
   account deletion/export and backup restore. Queries selecting `subject`
   must also select `subjectBinding` and all access links. Keep old keys during
   the recovery window.

## Booking snapshot binding expansion

New non-null `autocare_service_requests.bookingSnapshot` writes carry a
companion HMAC in `bookingSnapshotBinding`. The MAC covers the decrypted JSON,
request UUID and client/provider/location/definition UUIDs. ORM reads reject a
snapshot moved between requests or a changed owner/service link. A null
snapshot has a null binding. Migration `1786540000000` adds the nullable
binding and a durable checkpoint. The operator command reads UUID keysets of
at most 500 requests, authenticates AES-GCM and existing MACs, then
compare-writes missing bindings with checkpoint progress in one transaction.
It prints counts only. Account deletion clears the snapshot and its binding.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786540000000`. Run
   `npm --prefix server run encryption:backfill-booking-snapshot-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks all four owner/service links.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING=true` to all
   API/worker instances. Rehearse instant/request booking, quote acceptance,
   rescheduling, bonuses/refunds, account deletion/export and backup restore.
   Queries selecting `bookingSnapshot` must also select its binding and all
   owner/service links. Keep old keys during the recovery window.

## Accepted quote binding expansion

New non-null `autocare_service_requests.acceptedQuoteSnapshot` writes carry a
companion HMAC in `acceptedQuoteSnapshotBinding`. The MAC covers the decrypted JSON,
request UUID and client/provider/location/definition UUIDs. ORM reads reject a
snapshot moved between requests or a changed owner/service link. A null
snapshot has a null binding. Migration `1786550000000` adds the nullable
binding and a durable checkpoint. The operator command reads UUID keysets of
at most 500 requests, authenticates AES-GCM and existing MACs, then
compare-writes missing bindings with checkpoint progress in one transaction.
It prints counts only. Account deletion clears the snapshot and its binding.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786550000000`. Run
   `npm --prefix server run encryption:backfill-accepted-quote-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks all four owner/service links.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING=true` to all
   API/worker instances. Rehearse quote acceptance, booking, bonuses/refunds, account
   deletion/export and backup restore.
   Queries selecting `acceptedQuoteSnapshot` must also select its binding and all
   owner/service links. Keep old keys during the recovery window.

## Estimate snapshot binding expansion

New non-null `autocare_service_requests.estimateSnapshot` writes carry a
companion HMAC in `estimateSnapshotBinding`. The MAC covers the decrypted JSON,
request UUID and client/provider/location/definition UUIDs. ORM reads reject a
snapshot moved between requests or a changed owner/service link. A null
snapshot has a null binding. Migration `1786560000000` adds the nullable
binding and a durable checkpoint. The operator command reads UUID keysets of
at most 500 requests, authenticates AES-GCM and existing MACs, then
compare-writes missing bindings with checkpoint progress in one transaction.
It prints counts only. Account deletion clears the snapshot and its binding.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786560000000`. Run
   `npm --prefix server run encryption:backfill-estimate-snapshot-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks all four owner/service links.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING=true` to all
   API/worker instances. Rehearse quote acceptance, booking, bonuses/refunds, account
   deletion/export and backup restore.
   Queries selecting `estimateSnapshot` must also select its binding and all
   owner/service links; owner analytics has been updated for this. Keep old keys during the recovery window.

## Contact snapshot binding expansion

New non-null `autocare_service_requests.contactSnapshot` writes carry a
companion HMAC in `contactSnapshotBinding`. The MAC covers the decrypted JSON,
request UUID and client/provider/location/definition UUIDs. ORM reads reject a
snapshot moved between requests or a changed owner/service link. A null
snapshot has a null binding. Migration `1786570000000` adds the nullable
binding and a durable checkpoint. The operator command reads UUID keysets of
at most 500 requests, authenticates AES-GCM and existing MACs, then
compare-writes missing bindings with checkpoint progress in one transaction.
It prints counts only. Account deletion clears the snapshot and its binding.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786570000000`. Run
   `npm --prefix server run encryption:backfill-contact-snapshot-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks all four owner/service links.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING=true` to all
   API/worker instances. Rehearse request creation/read, contact export, account
   deletion and backup restore.
   Queries selecting `contactSnapshot` must also select its binding and all
   owner/service links. Keep old keys during the recovery window.

## Vehicle snapshot binding expansion

New non-null `autocare_service_requests.vehicleSnapshot` writes carry a
companion HMAC in `vehicleSnapshotBinding`. The MAC covers the decrypted JSON,
request UUID, client/provider/location/definition UUIDs and nullable vehicle UUID. ORM reads reject a
snapshot moved between requests or a changed owner/service link. A null
snapshot has a null binding. Migration `1786580000000` adds the nullable
binding and a durable checkpoint. The operator command reads UUID keysets of
at most 500 requests, authenticates AES-GCM and existing MACs, then
compare-writes missing bindings with checkpoint progress in one transaction.
It prints counts only. Account deletion clears the snapshot and its binding.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786580000000`. Run
   `npm --prefix server run encryption:backfill-vehicle-snapshot-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks all four owner/service links and vehicle UUID.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING=true` to all
   API/worker instances. Rehearse request creation/read, vehicle export, account
   deletion and backup restore.
   Queries selecting `vehicleSnapshot` must also select its binding and all
   owner/service links and vehicle UUID. Keep old keys during the recovery window.

## Service request note binding expansion

New non-null `autocare_service_requests.note` writes carry a companion HMAC in
`noteBinding`. The MAC covers the decrypted text, request UUID and
client/provider/location/definition UUIDs. ORM reads reject a note moved
between requests or a changed owner/service link. A null note has a null
binding. Migration `1786590000000` adds the nullable binding and a durable
checkpoint. The operator command reads UUID keysets of at most 500 requests,
authenticates AES-GCM and existing MACs, then compare-writes missing bindings
with checkpoint progress in one transaction. It prints counts only. Account
deletion clears the note and its binding.

After old writers have drained, the approved KMS keyring is available to the
command and a tested backup exists:

1. Apply migration `1786590000000`. Run
   `npm --prefix server run encryption:backfill-service-request-note-binding -- --mode apply --batch-size 100 --max-batches 100`
   until it reports `exhausted:true`. An interrupted run resumes its checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks all four owner/service links.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING=true` to all
   API/worker instances. Rehearse request creation/read, data export, account
   deletion and backup restore. Queries selecting `note` must also select its
   binding and all owner/service links. Keep old keys during the recovery window.

This does not bind other U02 encrypted fields.

## Service request outcome binding expansion

New non-null `autocare_service_requests.cancellationReason`, `noShowReason`
and `completionNote` writes receive separate companion HMACs. Each MAC covers
the decrypted text, request UUID and client/provider/location/definition UUIDs.
Migration `1786620000000` adds nullable bindings and a durable checkpoint.
The bounded command authenticates existing ciphertext and MACs, compare-writes
missing bindings with checkpoint progress in one transaction and prints counts
only. Account deletion clears values and bindings together.

After old writers have drained, the approved KMS keyring and tested backup are
available:

1. Apply migration `1786620000000`. Run
   `npm --prefix server run encryption:backfill-service-request-outcome-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`. Interrupted runs resume their checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Mismatch or budget exhaustion blocks cutover. Compare-write
   checks all four owner/service links and all three value/binding pairs.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they have drained. Reset removes only the checkpoint.
4. Only after a full staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_OUTCOME_RECORD_BINDING=true` to all
   API/worker instances. Rehearse request transitions/read, data export,
   account deletion and backup restore. Partial reads selecting an outcome field
   must also select its binding and all four owner/service UUIDs.
## Booking status history reason binding expansion

New non-null `booking_status_history.reason` writes receive a companion HMAC
in `reasonBinding`. It covers decrypted text, history UUID, booking UUID and
status. Migration `1786630000000` adds the nullable binding and durable
checkpoint. The bounded command authenticates ciphertext and existing MACs,
then compare-writes missing bindings with checkpoint progress in one short
transaction. The status history API excludes the internal binding. Account
deletion clears reason and binding together.

After old writers have drained, an approved KMS keyring and tested backup are
available:

1. Apply migration `1786630000000`. Run
   `npm --prefix server run encryption:backfill-booking-status-reason-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`. Interrupted runs resume from the checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   full pass. Any mismatch or incomplete scan blocks cutover. Compare-write
   checks booking UUID, status, ciphertext and existing binding.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING=true` to all
   API/worker instances. Rehearse status writes/reads, account deletion and
   backup restore. Partial reads selecting `reason` must also select its
   binding, history ID, booking ID and status.

## Trust evidence record binding expansion

New non-null `autocare_trust_evidence.reference` and `notes` writes receive
separate HMACs over decrypted text, evidence UUID, provider UUID and kind.
Reference is also checked against its blind index. Migration `1786700000000`
adds nullable bindings and a durable checkpoint. Account deletion clears both
texts, bindings and the reference index. Review revision supersession now loads
the evidence row before updating its encrypted note.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786700000000`. Run
   `npm --prefix server run encryption:backfill-trust-evidence-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`. Legacy null references with a stale index are
   cleared in the same compare-write transaction.
2. Run the same command with `--mode verify` using a full pass budget. Any
   mismatch or incomplete scan blocks cutover. Compare-write checks provider
   UUID, kind, both ciphertext/binding pairs and the index.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_TRUST_EVIDENCE_RECORD_BINDING=true` to all API/worker
   instances. Rehearse evidence create/review/revision/read, account deletion
   and backup restore. Partial reads selecting text must also select its
   binding, evidence/provider UUID and kind; reference also needs its index.

## Chat block reason binding expansion

New non-null `autocare_chat_blocks.reason` writes receive a companion HMAC
over decrypted text, block UUID, thread UUID, blocker UUID and blocked-user
UUID. Migration `1786690000000` adds the nullable binding and durable
checkpoint. Account deletion clears reason and binding together.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786690000000`. Run
   `npm --prefix server run encryption:backfill-chat-block-reason-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any
   mismatch or incomplete scan blocks cutover. Compare-write checks all scope
   UUIDs, ciphertext and binding.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_CHAT_BLOCK_REASON_RECORD_BINDING=true` to all
   API/worker instances. Rehearse restriction create/revoke/read, account
   deletion and backup restore. Partial reads selecting reason must also
   select its binding and block/thread/blocker/blocked UUIDs.

## Chat report text binding expansion

New non-null `autocare_chat_reports.description`, `resolutionReason`,
`assignmentReason` and `extensionReason` writes receive separate companion
HMACs. Each covers decrypted text, report UUID, thread UUID and reporter UUID.
Migration `1786680000000` adds nullable bindings and a durable checkpoint.
Account deletion clears values and bindings together. Response DTOs omit them.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786680000000`. Run
   `npm --prefix server run encryption:backfill-chat-report-text-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any
   mismatch or incomplete scan blocks cutover. Compare-write checks thread/
   reporter UUIDs and all four ciphertext/binding pairs.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_CHAT_REPORT_TEXT_RECORD_BINDING=true` to all
   API/worker instances. Rehearse report filing, assignment, extension,
   resolution, account deletion and backup restore. Partial entity reads
   selecting text must also select its binding and report/thread/reporter UUIDs.

## Service quote snapshot binding expansion

New `autocare_service_quotes.snapshot` writes receive a companion HMAC over
the decrypted JSON, quote UUID, request UUID, provider UUID and version.
Migration `1786670000000` adds the nullable binding and durable checkpoint.
Account deletion locks and redacts quotes in bounded ID pages, writing a
separate encrypted redacted snapshot and binding for each row.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786670000000`. Run
   `npm --prefix server run encryption:backfill-service-quote-snapshot-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any
   mismatch or incomplete scan blocks cutover. Compare-write checks
   request/provider UUIDs, version, ciphertext and binding.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_SERVICE_QUOTE_SNAPSHOT_RECORD_BINDING=true` to all
   API/worker instances. Rehearse quote create/update/read, account deletion,
   data export and backup restore. Partial reads selecting snapshot must also
   select its binding, quote/request/provider UUIDs and version.

## AutoCare reschedule text binding expansion

New non-null `autocare_reschedule_requests.reason` writes receive a companion
HMAC over decrypted text and reschedule/request/requester UUIDs. The separate
`resolutionReason` HMAC also covers nullable resolver UUID and decision status.
Migration `1786660000000` adds the nullable bindings and durable checkpoint.
Account deletion clears both value/binding pairs.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786660000000`. Run
   `npm --prefix server run encryption:backfill-autocare-reschedule-text-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`.
2. Run the same command with `--mode verify` using a full pass budget. Any
   mismatch or incomplete scan blocks cutover. Compare-write checks scope,
   status and both ciphertext/binding pairs.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_AUTOCARE_RESCHEDULE_TEXT_RECORD_BINDING=true` to all
   API/worker instances. Rehearse proposal/decision/expiry reads, account
   deletion and backup restore. Partial reads selecting text must also select
   its binding and required scope UUIDs.

## Booking reschedule resolution reason binding expansion

New non-null `booking_reschedule_requests.resolutionReason` writes receive a
companion HMAC over decrypted text, request UUID, booking UUID, requester UUID,
nullable resolver UUID and decision status. Migration `1786650000000` adds the
nullable binding and durable checkpoint. Account deletion clears the reason
and binding together. The booking response excludes the internal binding.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786650000000`. Run
   `npm --prefix server run encryption:backfill-booking-reschedule-reason-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`.
2. Run the same command with `--mode verify` using a budget for a full pass.
   Any mismatch or incomplete scan blocks cutover. Compare-write checks
   booking/requester/resolver UUIDs, status, ciphertext and binding.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_BOOKING_RESCHEDULE_REASON_RECORD_BINDING=true` to
   all API/worker instances. Rehearse resolution, reads, account deletion and
   backup restore. Partial reads selecting the reason must also select the
   binding, request ID, all owner UUIDs and status.

## Booking text field binding expansion

New non-null `bookings.comment`, `cancellationReason` and `ownerNote` writes
receive separate companion HMACs. Each covers decrypted text, booking UUID,
client UUID, cabinet UUID and service UUID. Migration `1786640000000` adds the
nullable bindings and durable checkpoint. Account deletion clears the value
and binding together; client and owner responses omit binding columns.

After old writers have drained and a tested backup and approved KMS keyring
are available:

1. Apply migration `1786640000000`. Run
   `npm --prefix server run encryption:backfill-booking-text-binding -- --mode apply --batch-size 100 --max-batches 100`
   until `exhausted:true`. Interrupted runs resume from the checkpoint.
2. Run the same command with `--mode verify` and a budget large enough for a
   complete pass. Any mismatch or incomplete scan blocks cutover. Compare-write
   checks the three scope UUIDs and all three ciphertext/binding pairs.
3. If old writers were active, coordinate `--mode reset`, then repeat apply
   and verify after they drain. Reset removes only the checkpoint.
4. After staging KMS/restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_BOOKING_TEXT_RECORD_BINDING=true` to all API/worker
   instances. Rehearse booking create/cancel/note/read, data export, account
   deletion and backup restore. Partial entity reads selecting a text field
   must also select the binding, booking ID and three scope UUIDs.

## Outbox recipient record binding expansion

New outbox email/toEmail and recipientName envelopes are bound to the event
UUID. Migration `1786480000000` adds only a checkpoint table. The operator
command reads UUID keysets of at most 500 events and updates legacy recipient
JSONB only when the original payload still matches. Each batch update and
checkpoint advance share a short transaction. It does not log recipient data.

After old API/worker writers have drained and the approved KMS keyring and a
tested backup are available:

1. Apply the migration, then run
   `npm --prefix server run encryption:backfill-outbox-binding -- --mode apply --batch-size 100 --max-batches 100`.
   Repeat until `exhausted:true`. Interrupted runs resume from the checkpoint.
   Concurrent changes to a payload abort the batch without advancing it;
   rerun after resolving the writer overlap.
2. Run the same command with `--mode verify` and a budget large enough for a
   complete pass. It authenticates every recipient envelope against the event
   UUID and the email blind index. Only `exhausted:true` confirms full scan
   coverage at that moment.
3. If an old writer created more unbound events during the scan, run
   `--mode reset`, then repeat apply and verify after the writer has drained.
   Reset deletes only checkpoint metadata. Never run reset concurrently with
   another backfill process.
4. After a full clean verification and restore rehearsal, deploy
   `DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING=true` to all API/worker
   instances. Missing or altered recipient bindings then fail reads. Rehearse
   retry, dead letter, redaction, deletion and worker delivery. Reverting the
   flag temporarily restores legacy reads; keep all historical keys available.

This command and CI coverage are preparation, not permission to switch a live
database. Verify throughput, locks, WAL lag, backup restore and old writer
drain on staging with the real KMS keyring. Other U02 encrypted fields remain
outside this outbox recipient cutover.

## Client vehicle field binding rollout (178660)

1. Deploy migration 178660 with the new writer on all API instances. Keep
   `DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING=false` during the
   expansion. Confirm the four binding columns and checkpoint table.
2. On staging with the intended KMS keyring and a restored representative
   database, run `npm --prefix server run encryption:backfill-client-vehicle-binding -- --mode apply --batch-size 500 --max-batches 100`. Repeat until `exhausted:true`. A compare-write conflict aborts the batch without advancing its checkpoint; resolve concurrent writes and retry.
3. Run the same command with `--mode verify` and enough batches to reach
   `exhausted:true`. Inspect reads, updates, deletion, restore and workload/lock
   metrics. If old writers produced unbound rows, drain them, run `--mode reset`
   and repeat apply and verify. Reset removes only checkpoint metadata.
4. Only after full verification and a restore rehearsal, enable
   `DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING=true` on every API
   instance. Missing or swapped bindings then fail reads. Retain historical
   keys; disabling the flag is a temporary compatibility rollback.

This code path has not been exercised against a live staging KMS or production
database; the current pilot gate remains NO-GO.

## User secondary field binding rollout (178661)

1. Deploy migration 178661 and the new writer on all API instances. Keep
   `DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING=false` during expansion.
2. On staging with the intended KMS keyring and a restored representative
   database, run `npm --prefix server run encryption:backfill-user-secondary-binding -- --mode apply --batch-size 500 --max-batches 100` until `exhausted:true`. A concurrent row change aborts its batch without advancing the checkpoint.
3. Run the same command with `--mode verify` and enough batches for
   `exhausted:true`. Check public profile, membership list, preference update,
   account deletion, locks, WAL and recovery. Drain old writers; if any new
   unbound rows appeared, run `--mode reset` and repeat apply and verify.
4. Enable `DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING=true` on
   every API instance only after full verification and restore rehearsal.
   Retain historical keys; disabling strict is a temporary compatibility rollback.

This path has not been exercised against a live staging KMS or production data.
