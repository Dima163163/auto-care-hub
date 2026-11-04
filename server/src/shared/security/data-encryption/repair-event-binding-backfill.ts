import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { REPAIR_EVENT_FIELDS, repairEventContext, serializeRepairEventField,
    type RepairEventBinding, type RepairEventRecord, type RepairEventValue } from './repair-event-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type EventRow = Required<Pick<RepairEventRecord, 'requestId' | 'eventType'>>
    & Record<RepairEventValue, unknown> & Record<RepairEventBinding, string | null>
type Bindings = Record<RepairEventBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_repair_events'
const CHECKPOINT_TABLE = 'repair_event_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<EventRow>, requireBinding: boolean): Bindings {
    const context = repairEventContext(row.value)
    const result: Bindings = { titleBinding: null, notesBinding: null, metadataBinding: null }
    for (const { value, binding } of REPAIR_EVENT_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (value !== 'notes' || existing !== null) throw new Error(`Encrypted repair event ${value} binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue(TABLE, value, raw)
        const serialized = serializeRepairEventField(value, plaintext)
        verifyPlaintextRecordBinding(TABLE, value, serialized, row.id, existing,
            { allowLegacy: !requireBinding, context })
        result[binding] = existing ?? createPlaintextRecordBinding(TABLE, value, serialized, row.id, context)
    }
    return result
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<EventRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "requestId", "eventType", "title", "titleBinding", "notes", "notesBinding", "metadata", "metadataBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & EventRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Repair event binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Repair event binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetRepairEventBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE])
}

export async function runRepairEventBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Repair event binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (REPAIR_EVENT_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "titleBinding" = $1, "notesBinding" = $2, "metadataBinding" = $3 WHERE "id" = $4::uuid AND "requestId" = $5::uuid AND "eventType" = $6 AND "title" IS NOT DISTINCT FROM $7::text AND "titleBinding" IS NOT DISTINCT FROM $8 AND "notes" IS NOT DISTINCT FROM $9::text AND "notesBinding" IS NOT DISTINCT FROM $10 AND "metadata" IS NOT DISTINCT FROM $11::jsonb AND "metadataBinding" IS NOT DISTINCT FROM $12 RETURNING "id"`,
                        [value.titleBinding, value.notesBinding, value.metadataBinding, row.id,
                            row.value.requestId, row.value.eventType, row.value.title,
                            row.value.titleBinding, row.value.notes, row.value.notesBinding,
                            row.value.metadata, row.value.metadataBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) throw new Error('Repair event binding source row changed concurrently.')
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

export async function verifyRepairEventBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
