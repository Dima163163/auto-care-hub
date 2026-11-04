import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { GUARANTEE_CLAIM_FIELDS, guaranteeClaimContext,
    type GuaranteeClaimBinding, type GuaranteeClaimRecord, type GuaranteeClaimValue } from './guarantee-claim-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type ClaimRow = Required<Pick<GuaranteeClaimRecord, 'requestId' | 'clientId' | 'providerId' | 'claimType'>>
    & Record<GuaranteeClaimValue, unknown> & Record<GuaranteeClaimBinding, string | null>
type Bindings = Record<GuaranteeClaimBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_guarantee_claims'
const CHECKPOINT_TABLE = 'guarantee_claim_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<ClaimRow>, requireBinding: boolean): Bindings {
    const context = guaranteeClaimContext(row.value)
    const result: Bindings = { summaryBinding: null, resolutionBinding: null }
    for (const { value, binding } of GUARANTEE_CLAIM_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (value !== 'resolution' || existing !== null) throw new Error(`Encrypted guarantee claim ${value} binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue(TABLE, value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted guarantee claim ${value} is invalid.`)
        const serialized = plaintext
        verifyPlaintextRecordBinding(TABLE, value, serialized, row.id, existing,
            { allowLegacy: !requireBinding, context })
        result[binding] = existing ?? createPlaintextRecordBinding(TABLE, value, serialized, row.id, context)
    }
    return result
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<ClaimRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "requestId", "clientId", "providerId", "claimType", "summary", "summaryBinding", "resolution", "resolutionBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & ClaimRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Guarantee claim binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Guarantee claim binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetGuaranteeClaimBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE])
}

export async function runGuaranteeClaimBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query(`INSERT INTO "${CHECKPOINT_TABLE}" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`, [TABLE])
    const initial = parseCheckpoint(await source.query(
        `SELECT "afterId", "processed" FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    `SELECT "afterId", "processed" FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1 FOR UPDATE`, [TABLE],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Guarantee claim binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (GUARANTEE_CLAIM_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "summaryBinding" = $1, "resolutionBinding" = $2 WHERE "id" = $3::uuid AND "requestId" = $4::uuid AND "clientId" = $5::uuid AND "providerId" = $6::uuid AND "claimType" = $7 AND "summary" IS NOT DISTINCT FROM $8::text AND "summaryBinding" IS NOT DISTINCT FROM $9 AND "resolution" IS NOT DISTINCT FROM $10::text AND "resolutionBinding" IS NOT DISTINCT FROM $11 RETURNING "id"`,
                        [value.summaryBinding, value.resolutionBinding, row.id, row.value.requestId,
                            row.value.clientId, row.value.providerId, row.value.claimType, row.value.summary,
                            row.value.summaryBinding, row.value.resolution, row.value.resolutionBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) throw new Error('Guarantee claim binding source row changed concurrently.')
                }
                await manager.query(
                    `UPDATE "${CHECKPOINT_TABLE}" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1`,
                    [TABLE, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyGuaranteeClaimBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
