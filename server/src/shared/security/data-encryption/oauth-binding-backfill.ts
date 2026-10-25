import type { DataSource } from 'typeorm'
import { bindExistingEncryptedFieldValue, createBlindIndex, decryptRecordBoundFieldValue, isEmailBlindIndex, type EncryptedRecordScope } from './field-encryption.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type OAuthRow = {
    provider: string
    userId: string
    providerSubject: string
    providerSubjectCiphertext: string
}
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'oauth_identities'

function scopeFor(row: BackfillRow<OAuthRow>): EncryptedRecordScope {
    if (row.value.provider !== 'google' && row.value.provider !== 'yandex') {
        throw new Error('Encrypted OAuth subject provider is invalid.')
    }
    if (typeof row.value.userId !== 'string') throw new Error('Encrypted OAuth subject owner ID is missing.')
    return { rowId: row.id, ownerId: row.value.userId, context: row.value.provider }
}

function validateRow(row: BackfillRow<OAuthRow>, requireBinding: boolean) {
    const plaintext = decryptRecordBoundFieldValue<string>(
        'oauth_identities', 'providerSubject', row.value.providerSubjectCiphertext, scopeFor(row),
        { allowLegacy: !requireBinding },
    )
    if (typeof plaintext !== 'string' || !isEmailBlindIndex(row.value.providerSubject)
        || createBlindIndex(plaintext, 'oauth-provider-subject') !== row.value.providerSubject) {
        throw new Error('Encrypted OAuth subject index authentication failed.')
    }
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<OAuthRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "provider", "user_id" AS "userId", "provider_subject" AS "providerSubject", "provider_subject_ciphertext" AS "providerSubjectCiphertext" FROM "oauth_identities" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & OAuthRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('OAuth binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('OAuth binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetOAuthBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "oauth_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runOAuthBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "oauth_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "oauth_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) {
            validateRow(row, false)
            const envelope = JSON.parse(row.value.providerSubjectCiphertext) as { recordBinding?: string }
            if (Object.hasOwn(envelope, 'recordBinding')) return row.value.providerSubjectCiphertext
            return JSON.stringify(bindExistingEncryptedFieldValue(
                'oauth_identities', 'providerSubject', envelope, scopeFor(row),
            ))
        },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "oauth_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('OAuth binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.providerSubjectCiphertext) continue
                    const updated = await manager.query(
                        'UPDATE "oauth_identities" SET "provider_subject_ciphertext" = $1 WHERE "id" = $2::uuid AND "provider" = $3 AND "user_id" = $4::uuid AND "provider_subject" = $5 AND "provider_subject_ciphertext" = $6 RETURNING "id"',
                        [value, row.id, row.value.provider, row.value.userId, row.value.providerSubject, row.value.providerSubjectCiphertext],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('OAuth binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "oauth_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyOAuthBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) {
            validateRow(row, true)
            return null
        },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
