import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type UserProfileRow = {
    name: string
    phone: string | null
    nameBinding: string | null
    phoneBinding: string | null
}
type Bindings = { nameBinding: string; phoneBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'users'

function transformRow(row: BackfillRow<UserProfileRow>, requireBinding: boolean): Bindings {
    const name = decryptFieldValue<string>('users', 'name', row.value.name)
    if (typeof name !== 'string') throw new Error('Encrypted users.name is invalid.')
    verifyPlaintextRecordBinding('users', 'name', name, row.id, row.value.nameBinding, { allowLegacy: !requireBinding })
    const nameBinding = row.value.nameBinding ?? createPlaintextRecordBinding('users', 'name', name, row.id)
    if (row.value.phone === null) {
        if (row.value.phoneBinding !== null) throw new Error('Encrypted users.phone record binding is invalid.')
        return { nameBinding, phoneBinding: null }
    }
    const phone = decryptFieldValue<string>('users', 'phone', row.value.phone)
    if (typeof phone !== 'string') throw new Error('Encrypted users.phone is invalid.')
    verifyPlaintextRecordBinding('users', 'phone', phone, row.id, row.value.phoneBinding, { allowLegacy: !requireBinding })
    return {
        nameBinding,
        phoneBinding: row.value.phoneBinding ?? createPlaintextRecordBinding('users', 'phone', phone, row.id),
    }
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<UserProfileRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "name", "phone", "nameBinding", "phoneBinding" FROM "users" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & UserProfileRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('User profile binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('User profile binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetUserProfileBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "user_profile_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runUserProfileBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "user_profile_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "user_profile_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "user_profile_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('User profile binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value.nameBinding === row.value.nameBinding && value.phoneBinding === row.value.phoneBinding) continue
                    const updated = await manager.query(
                        'UPDATE "users" SET "nameBinding" = $1, "phoneBinding" = $2 WHERE "id" = $3::uuid AND "name" = $4 AND "phone" IS NOT DISTINCT FROM $5 AND "nameBinding" IS NOT DISTINCT FROM $6 AND "phoneBinding" IS NOT DISTINCT FROM $7 RETURNING "id"',
                        [value.nameBinding, value.phoneBinding, row.id, row.value.name, row.value.phone, row.value.nameBinding, row.value.phoneBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('User profile binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "user_profile_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyUserProfileBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
