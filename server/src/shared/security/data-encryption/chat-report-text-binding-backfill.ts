import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { CHAT_REPORT_TEXT_FIELDS, chatReportTextContext, type ChatReportTextBinding, type ChatReportTextValue } from './chat-report-text-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type ReportRow = { threadId: string; reporterId: string }
    & Record<ChatReportTextValue, unknown | null> & Record<ChatReportTextBinding, string | null>
type Bindings = Record<ChatReportTextBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_chat_reports'
const CHECKPOINT_TABLE = 'chat_report_text_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<ReportRow>, requireBinding: boolean): Bindings {
    const context = chatReportTextContext(row.value)
    const bindings: Bindings = {
        descriptionBinding: null, resolutionReasonBinding: null,
        assignmentReasonBinding: null, extensionReasonBinding: null,
    }
    for (const { value, binding } of CHAT_REPORT_TEXT_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (existing !== null) throw new Error(`Encrypted autocare_chat_reports.${value} record binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue('autocare_chat_reports', value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted autocare_chat_reports.${value} is invalid.`)
        verifyPlaintextRecordBinding('autocare_chat_reports', value, plaintext, row.id, existing, { allowLegacy: !requireBinding, context })
        bindings[binding] = existing ?? createPlaintextRecordBinding('autocare_chat_reports', value, plaintext, row.id, context)
    }
    return bindings
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<ReportRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "threadId", "reporterId", "description", "descriptionBinding", "resolutionReason", "resolutionReasonBinding", "assignmentReason", "assignmentReasonBinding", "extensionReason", "extensionReasonBinding" FROM "autocare_chat_reports" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & ReportRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Chat report text binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Chat report text binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetChatReportTextBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runChatReportTextBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Chat report text binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (CHAT_REPORT_TEXT_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_chat_reports" SET "descriptionBinding" = $1, "resolutionReasonBinding" = $2, "assignmentReasonBinding" = $3, "extensionReasonBinding" = $4 WHERE "id" = $5::uuid AND "threadId" = $6::uuid AND "reporterId" = $7::uuid AND "description" IS NOT DISTINCT FROM $8::text AND "descriptionBinding" IS NOT DISTINCT FROM $9 AND "resolutionReason" IS NOT DISTINCT FROM $10::text AND "resolutionReasonBinding" IS NOT DISTINCT FROM $11 AND "assignmentReason" IS NOT DISTINCT FROM $12::text AND "assignmentReasonBinding" IS NOT DISTINCT FROM $13 AND "extensionReason" IS NOT DISTINCT FROM $14::text AND "extensionReasonBinding" IS NOT DISTINCT FROM $15 RETURNING "id"',
                        [value.descriptionBinding, value.resolutionReasonBinding, value.assignmentReasonBinding, value.extensionReasonBinding,
                            row.id, row.value.threadId, row.value.reporterId,
                            row.value.description, row.value.descriptionBinding, row.value.resolutionReason, row.value.resolutionReasonBinding,
                            row.value.assignmentReason, row.value.assignmentReasonBinding, row.value.extensionReason, row.value.extensionReasonBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Chat report text binding source row changed concurrently.')
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

export async function verifyChatReportTextBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
