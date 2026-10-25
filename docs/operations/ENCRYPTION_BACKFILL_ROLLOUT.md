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
fields and outbox payloads still need the wider versioned U02 rollout above.
