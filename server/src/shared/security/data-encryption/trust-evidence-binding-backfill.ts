import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { TRUST_EVIDENCE_FIELDS, trustEvidenceContext, verifyTrustEvidenceReferenceIndex,
    type TrustEvidenceBinding, type TrustEvidenceValue } from './trust-evidence-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type EvidenceRow = { providerId: string; kind: string; referenceIndex: string | null }
    & Record<TrustEvidenceValue, unknown | null> & Record<TrustEvidenceBinding, string | null>
type Bindings = Record<TrustEvidenceBinding, string | null> & { referenceIndex: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_trust_evidence'
const CHECKPOINT_TABLE = 'trust_evidence_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<EvidenceRow>, requireBinding: boolean): Bindings {
    const context = trustEvidenceContext(row.value)
    const bindings: Bindings = { referenceBinding: null, notesBinding: null, referenceIndex: row.value.referenceIndex }
    for (const { value, binding } of TRUST_EVIDENCE_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (existing !== null) throw new Error(`Encrypted autocare_trust_evidence.${value} record binding is invalid.`)
            if (value === 'reference') {
                verifyTrustEvidenceReferenceIndex(null, row.value.referenceIndex, !requireBinding)
                bindings.referenceIndex = null
            }
            continue
        }
        const plaintext = decryptFieldValue('autocare_trust_evidence', value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted autocare_trust_evidence.${value} is invalid.`)
        if (value === 'reference') verifyTrustEvidenceReferenceIndex(plaintext, row.value.referenceIndex)
        verifyPlaintextRecordBinding('autocare_trust_evidence', value, plaintext, row.id, existing,
            { allowLegacy: !requireBinding, context })
        bindings[binding] = existing ?? createPlaintextRecordBinding('autocare_trust_evidence', value, plaintext, row.id, context)
    }
    return bindings
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<EvidenceRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "providerId", "kind", "reference", "referenceIndex", "referenceBinding", "notes", "notesBinding" FROM "autocare_trust_evidence" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & EvidenceRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Trust evidence binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Trust evidence binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetTrustEvidenceBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runTrustEvidenceBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Trust evidence binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value.referenceBinding === row.value.referenceBinding && value.notesBinding === row.value.notesBinding
                        && value.referenceIndex === row.value.referenceIndex) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_trust_evidence" SET "referenceBinding" = $1, "notesBinding" = $2, "referenceIndex" = $3 WHERE "id" = $4::uuid AND "providerId" = $5::uuid AND "kind" = $6 AND "reference" IS NOT DISTINCT FROM $7::text AND "referenceIndex" IS NOT DISTINCT FROM $8 AND "referenceBinding" IS NOT DISTINCT FROM $9 AND "notes" IS NOT DISTINCT FROM $10::text AND "notesBinding" IS NOT DISTINCT FROM $11 RETURNING "id"',
                        [value.referenceBinding, value.notesBinding, value.referenceIndex,
                            row.id, row.value.providerId, row.value.kind, row.value.reference,
                            row.value.referenceIndex, row.value.referenceBinding, row.value.notes, row.value.notesBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Trust evidence binding source row changed concurrently.')
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

export async function verifyTrustEvidenceBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
