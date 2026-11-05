import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { CATALOG_GAP_FIELDS, catalogGapContext, serializeCatalogGapField,
    type CatalogGapBinding, type CatalogGapRecord, type CatalogGapValue } from './catalog-gap-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type GapRow = Required<Pick<CatalogGapRecord, 'requestedById' | 'providerId' | 'proposedSlug' | 'categorySlug' | 'priceType'>>
    & Record<CatalogGapValue, unknown> & Record<CatalogGapBinding, string | null>
type Bindings = Record<CatalogGapBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_catalog_gap_requests'
const CHECKPOINT_TABLE = 'catalog_gap_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<GapRow>, requireBinding: boolean): Bindings {
    const context = catalogGapContext(row.value)
    const result: Bindings = { labelsBinding: null, comparisonAttributesBinding: null,
        rationaleBinding: null, reviewReasonBinding: null }
    for (const { value, binding } of CATALOG_GAP_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (value !== 'reviewReason' || existing !== null) {
                throw new Error(`Encrypted catalog gap ${value} binding is invalid.`)
            }
            continue
        }
        const plaintext = decryptFieldValue(TABLE, value, raw)
        const serialized = serializeCatalogGapField(value, plaintext)
        verifyPlaintextRecordBinding(TABLE, value, serialized, row.id, existing,
            { allowLegacy: !requireBinding, context })
        result[binding] = existing ?? createPlaintextRecordBinding(TABLE, value, serialized, row.id, context)
    }
    return result
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<GapRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "requestedById", "providerId", "proposedSlug", "categorySlug", "priceType", "labels", "labelsBinding", "comparisonAttributes", "comparisonAttributesBinding", "rationale", "rationaleBinding", "reviewReason", "reviewReasonBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & GapRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Catalog gap binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Catalog gap binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetCatalogGapBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE])
}

export async function runCatalogGapBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Catalog gap binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (CATALOG_GAP_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "labelsBinding" = $1, "comparisonAttributesBinding" = $2, "rationaleBinding" = $3, "reviewReasonBinding" = $4 WHERE "id" = $5::uuid AND "requestedById" = $6::uuid AND "providerId" IS NOT DISTINCT FROM $7::uuid AND "proposedSlug" = $8 AND "categorySlug" = $9 AND "priceType" = $10 AND "labels" IS NOT DISTINCT FROM $11::jsonb AND "labelsBinding" IS NOT DISTINCT FROM $12 AND "comparisonAttributes" IS NOT DISTINCT FROM $13::jsonb AND "comparisonAttributesBinding" IS NOT DISTINCT FROM $14 AND "rationale" IS NOT DISTINCT FROM $15::text AND "rationaleBinding" IS NOT DISTINCT FROM $16 AND "reviewReason" IS NOT DISTINCT FROM $17::text AND "reviewReasonBinding" IS NOT DISTINCT FROM $18 RETURNING "id"`,
                        [value.labelsBinding, value.comparisonAttributesBinding, value.rationaleBinding,
                            value.reviewReasonBinding, row.id, row.value.requestedById, row.value.providerId,
                            row.value.proposedSlug, row.value.categorySlug, row.value.priceType,
                            row.value.labels, row.value.labelsBinding, row.value.comparisonAttributes,
                            row.value.comparisonAttributesBinding, row.value.rationale, row.value.rationaleBinding,
                            row.value.reviewReason, row.value.reviewReasonBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Catalog gap binding source row changed concurrently.')
                    }
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

export async function verifyCatalogGapBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
