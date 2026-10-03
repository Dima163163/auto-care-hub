# Encryption backfill rollout — N09

The published `1786410000000` migration is immutable. It loads entire columns
and identities in one transaction and is unsuitable for an unmeasured large
legacy database. Do not rewrite its checksum, run it blindly on real data,
re-encrypt h1 indexes during KEK rotation, or retire historical keys/backups.

The bounded engine `bounded-backfill.ts` provides keyset iteration (≤500 rows),
explicit run budgets, durable checkpoints through an atomic adapter, failure
propagation and restart. It never selects a production key provider, logs row
values, or connects to a database. It is preparation, not a production migration.

Before wiring a DB adapter, resolve U01 external KMS and U02 envelope scope/version.
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
Production adapter/rollout remains pending the owner choices and isolated DB
scale/recovery evidence. No current database or historical archive was touched.
