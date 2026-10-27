# Encryption backfill rollout — N09

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

This does not bind other U02 encrypted fields.

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
