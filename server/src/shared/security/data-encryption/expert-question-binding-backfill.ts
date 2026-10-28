import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { EXPERT_QUESTION_FIELDS, expertQuestionContext, serializeExpertQuestionField,
    type ExpertQuestionBinding, type ExpertQuestionRecord, type ExpertQuestionValue } from './expert-question-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type QuestionRow = Required<Pick<ExpertQuestionRecord, 'clientId'>>
    & Record<ExpertQuestionValue, unknown> & Record<ExpertQuestionBinding, string | null>
type Bindings = Record<ExpertQuestionBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_expert_questions'
const CHECKPOINT_TABLE = 'expert_question_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<QuestionRow>, requireBinding: boolean): Bindings {
    const context = expertQuestionContext(row.value)
    const result: Bindings = { vehicleSnapshotBinding: null, symptomsBinding: null, answerBinding: null }
    for (const { value, binding } of EXPERT_QUESTION_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (value === 'symptoms' || existing !== null) throw new Error(`Encrypted expert question ${value} binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue(TABLE, value, raw)
        const serialized = serializeExpertQuestionField(value, plaintext)
        verifyPlaintextRecordBinding(TABLE, value, serialized, row.id, existing,
            { allowLegacy: !requireBinding, context })
        result[binding] = existing ?? createPlaintextRecordBinding(TABLE, value, serialized, row.id, context)
    }
    return result
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<QuestionRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "clientId", "vehicleSnapshot", "vehicleSnapshotBinding", "symptoms", "symptomsBinding", "answer", "answerBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & QuestionRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Expert question binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Expert question binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetExpertQuestionBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE])
}

export async function runExpertQuestionBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Expert question binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (EXPERT_QUESTION_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "vehicleSnapshotBinding" = $1, "symptomsBinding" = $2, "answerBinding" = $3 WHERE "id" = $4::uuid AND "clientId" = $5::uuid AND "vehicleSnapshot" IS NOT DISTINCT FROM $6::jsonb AND "vehicleSnapshotBinding" IS NOT DISTINCT FROM $7 AND "symptoms" IS NOT DISTINCT FROM $8::text AND "symptomsBinding" IS NOT DISTINCT FROM $9 AND "answer" IS NOT DISTINCT FROM $10::text AND "answerBinding" IS NOT DISTINCT FROM $11 RETURNING "id"`,
                        [value.vehicleSnapshotBinding, value.symptomsBinding, value.answerBinding, row.id,
                            row.value.clientId, row.value.vehicleSnapshot, row.value.vehicleSnapshotBinding,
                            row.value.symptoms, row.value.symptomsBinding, row.value.answer, row.value.answerBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) throw new Error('Expert question binding source row changed concurrently.')
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

export async function verifyExpertQuestionBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
