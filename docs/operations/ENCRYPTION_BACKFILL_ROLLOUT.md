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
Production backfill adapter/rollout remains pending U02 and isolated DB
scale/recovery evidence. No current database or historical archive was touched.
