import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { providerChangeRequestContext, serializeProviderChangeRequestPayload,
    type ProviderChangeRequestRecord } from './provider-change-request-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type RequestRow = Required<Pick<ProviderChangeRequestRecord,
    'providerId' | 'requestedById' | 'kind' | 'payload' | 'payloadBinding' | 'reviewReason' | 'reviewReasonBinding'>>
type Bindings = { payloadBinding: string; reviewReasonBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_provider_change_requests'
const CHECKPOINT_NAME = TABLE
const CHECKPOINT_TABLE = 'provider_change_request_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<RequestRow>, requireBinding: boolean): Bindings {
    const context = providerChangeRequestContext(row.value)
    const payload = decryptFieldValue(TABLE, 'payload', row.value.payload)
    const serialized = serializeProviderChangeRequestPayload(payload)
    verifyPlaintextRecordBinding(TABLE, 'payload', serialized, row.id, row.value.payloadBinding,
        { allowLegacy: !requireBinding, context })
    const payloadBinding = row.value.payloadBinding
        ?? createPlaintextRecordBinding(TABLE, 'payload', serialized, row.id, context)
    let reviewReasonBinding: string | null = null
    if (row.value.reviewReason === null) {
        if (row.value.reviewReasonBinding !== null) throw new Error('Encrypted provider change request review reason binding is invalid.')
    } else {
        const reason = decryptFieldValue(TABLE, 'reviewReason', row.value.reviewReason)
        if (typeof reason !== 'string') throw new Error('Encrypted provider change request review reason is invalid.')
        verifyPlaintextRecordBinding(TABLE, 'reviewReason', reason, row.id, row.value.reviewReasonBinding,
            { allowLegacy: !requireBinding, context })
        reviewReasonBinding = row.value.reviewReasonBinding
            ?? createPlaintextRecordBinding(TABLE, 'reviewReason', reason, row.id, context)
    }
    return { payloadBinding, reviewReasonBinding }
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<RequestRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "providerId", "requestedById", "kind", "payload", "payloadBinding", "reviewReason", "reviewReasonBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & RequestRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Provider change request binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Provider change request binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetProviderChangeRequestBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runProviderChangeRequestBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query(`INSERT INTO "${CHECKPOINT_TABLE}" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`, [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        `SELECT "afterId", "processed" FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    `SELECT "afterId", "processed" FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1 FOR UPDATE`, [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Provider change request binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value.payloadBinding === row.value.payloadBinding
                        && value.reviewReasonBinding === row.value.reviewReasonBinding) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "payloadBinding" = $1, "reviewReasonBinding" = $2 WHERE "id" = $3::uuid AND "providerId" = $4::uuid AND "requestedById" = $5::uuid AND "kind" = $6 AND "payload" IS NOT DISTINCT FROM $7::jsonb AND "payloadBinding" IS NOT DISTINCT FROM $8 AND "reviewReason" IS NOT DISTINCT FROM $9::text AND "reviewReasonBinding" IS NOT DISTINCT FROM $10 RETURNING "id"`,
                        [value.payloadBinding, value.reviewReasonBinding, row.id, row.value.providerId,
                            row.value.requestedById, row.value.kind, row.value.payload,
                            row.value.payloadBinding, row.value.reviewReason, row.value.reviewReasonBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Provider change request binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    `UPDATE "${CHECKPOINT_TABLE}" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1`,
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyProviderChangeRequestBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
