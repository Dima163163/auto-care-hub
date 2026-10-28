import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { USER_SECONDARY_BOUND_FIELDS, type UserSecondaryBindingColumn, type UserSecondaryValueColumn } from './user-secondary-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type UserRow = Record<UserSecondaryValueColumn, unknown | null>
    & Record<UserSecondaryBindingColumn, string | null>
type Bindings = Record<UserSecondaryBindingColumn, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'users'

function transformRow(row: BackfillRow<UserRow>, requireBinding: boolean): Bindings {
    const bindings: Bindings = { avatarUrlBinding: null, communityDisplayNameBinding: null, preferredCityBinding: null }
    for (const { value, binding } of USER_SECONDARY_BOUND_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (existing !== null) throw new Error(`Encrypted users.${value} record binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue('users', value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted users.${value} is invalid.`)
        verifyPlaintextRecordBinding('users', value, plaintext, row.id, existing, { allowLegacy: !requireBinding })
        bindings[binding] = existing ?? createPlaintextRecordBinding('users', value, plaintext, row.id)
    }
    return bindings
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<UserRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "avatarUrl", "avatarUrlBinding", "communityDisplayName", "communityDisplayNameBinding", "preferredCity", "preferredCityBinding" FROM "users" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & UserRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('User secondary binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('User secondary binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetUserSecondaryBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "user_secondary_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runUserSecondaryBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "user_secondary_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "user_secondary_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "user_secondary_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('User secondary binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (USER_SECONDARY_BOUND_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        'UPDATE "users" SET "avatarUrlBinding" = $1, "communityDisplayNameBinding" = $2, "preferredCityBinding" = $3 WHERE "id" = $4::uuid AND "avatarUrl" IS NOT DISTINCT FROM $5 AND "avatarUrlBinding" IS NOT DISTINCT FROM $6 AND "communityDisplayName" IS NOT DISTINCT FROM $7 AND "communityDisplayNameBinding" IS NOT DISTINCT FROM $8 AND "preferredCity" IS NOT DISTINCT FROM $9 AND "preferredCityBinding" IS NOT DISTINCT FROM $10 RETURNING "id"',
                        [value.avatarUrlBinding, value.communityDisplayNameBinding, value.preferredCityBinding,
                            row.id, row.value.avatarUrl, row.value.avatarUrlBinding,
                            row.value.communityDisplayName, row.value.communityDisplayNameBinding,
                            row.value.preferredCity, row.value.preferredCityBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('User secondary binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "user_secondary_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyUserSecondaryBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
