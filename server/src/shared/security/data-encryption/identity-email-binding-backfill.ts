import type { DataSource } from 'typeorm'
import { bindExistingEncryptedFieldValue, decryptRecordBoundFieldValue, verifyEmailBlindIndex, type EncryptedRecordScope } from './field-encryption.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

export type EmailBindingTable = 'users' | 'autocare_provider_invitations'
type EmailRow = { email: string; emailCiphertext: string; providerId?: string }
type StoredCheckpoint = { afterId: string | null; processed: string }

function assertTable(table: string): asserts table is EmailBindingTable {
    if (table !== 'users' && table !== 'autocare_provider_invitations') {
        throw new Error('Unsupported email binding table.')
    }
}

function scopeFor(table: EmailBindingTable, row: BackfillRow<EmailRow>): EncryptedRecordScope {
    if (table === 'autocare_provider_invitations') {
        if (typeof row.value.providerId !== 'string') throw new Error('Encrypted invitation owner ID is missing.')
        return { rowId: row.id, ownerId: row.value.providerId }
    }
    return { rowId: row.id }
}

function validateEmailRow(table: EmailBindingTable, row: BackfillRow<EmailRow>, requireBinding: boolean) {
    const plaintext = decryptRecordBoundFieldValue<string>(table, 'email', row.value.emailCiphertext, scopeFor(table, row), {
        allowLegacy: !requireBinding,
    })
    if (!verifyEmailBlindIndex(plaintext, row.value.email)) {
        throw new Error(`Encrypted ${table}.email index authentication failed.`)
    }
}

async function readBatch(source: DataSource, table: EmailBindingTable, afterId: string | null, limit: number): Promise<BackfillRow<EmailRow>[]> {
    const providerColumn = table === 'autocare_provider_invitations' ? ', "providerId"' : ''
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "email", "emailCiphertext"${providerColumn} FROM "${table}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & EmailRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Email binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Email binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetEmailBindingBackfill(source: DataSource, table: EmailBindingTable) {
    assertTable(table)
    await source.query('DELETE FROM "email_binding_backfill_checkpoints" WHERE "name" = $1', [table])
}

export async function runIdentityEmailBindingBackfill(source: DataSource, table: EmailBindingTable, options: {
    batchSize: number; maxBatches: number
}) {
    assertTable(table)
    await source.query('INSERT INTO "email_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [table])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "email_binding_backfill_checkpoints" WHERE "name" = $1', [table],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill(sourceAdapter(), { checkpoint: initial, ...options })

    function sourceAdapter() {
        return {
            readBatch: (afterId: string | null, limit: number) => readBatch(source, table, afterId, limit),
            async transform(row: BackfillRow<EmailRow>) {
                validateEmailRow(table, row, false)
                const envelope = JSON.parse(row.value.emailCiphertext) as { recordBinding?: string }
                if (Object.hasOwn(envelope, 'recordBinding')) return row.value.emailCiphertext
                return JSON.stringify(bindExistingEncryptedFieldValue(table, 'email', envelope, scopeFor(table, row)))
            },
            async commitBatch(rows: Array<{ source: BackfillRow<EmailRow>; value: string }>, next: BackfillCheckpoint) {
                await source.transaction(async (manager) => {
                    const stored = parseCheckpoint(await manager.query(
                        'SELECT "afterId", "processed" FROM "email_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [table],
                    ) as StoredCheckpoint[])
                    if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                        throw new Error('Email binding backfill checkpoint changed concurrently.')
                    }
                    for (const { source: row, value } of rows) {
                        if (value === row.value.emailCiphertext) continue
                        const ownerPredicate = table === 'autocare_provider_invitations' ? 'AND "providerId" = $5::uuid' : ''
                        const parameters = [value, row.id, row.value.email, row.value.emailCiphertext]
                        if (table === 'autocare_provider_invitations') parameters.push(row.value.providerId ?? '')
                        const updated = await manager.query(
                            `UPDATE "${table}" SET "emailCiphertext" = $1 WHERE "id" = $2::uuid AND "email" = $3 AND "emailCiphertext" = $4 ${ownerPredicate} RETURNING "id"`,
                            parameters,
                        ) as [Array<{ id: string }>, number]
                        if (updated[1] !== 1 || updated[0].length !== 1) {
                            throw new Error('Email binding source row changed concurrently.')
                        }
                    }
                    await manager.query(
                        'UPDATE "email_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                        [table, next.afterId, next.processed],
                    )
                })
                previous = next
            },
        }
    }
}

export async function verifyIdentityEmailBindings(source: DataSource, table: EmailBindingTable, options: {
    batchSize: number; maxBatches: number
}) {
    assertTable(table)
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, table, afterId, limit),
        async transform(row) {
            validateEmailRow(table, row, true)
            return null
        },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
