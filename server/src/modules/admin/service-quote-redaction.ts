import type { EntityManager } from 'typeorm'
import { encryptRedactedFieldValue } from '../../shared/security/data-encryption/field-encryption.js'
import { createPlaintextRecordBinding } from '../../shared/security/data-encryption/plaintext-record-binding.js'
import { serializeServiceQuoteSnapshot, serviceQuoteSnapshotContext } from '../../shared/security/data-encryption/service-quote-snapshot-record-binding.js'

type QuoteScope = { id: string; requestId: string; providerId: string; version: number }
const REDACTED_SNAPSHOT = { redacted: true }
const BATCH_SIZE = 500
const FIRST_UUID = '00000000-0000-0000-0000-000000000000'

export async function redactServiceQuoteSnapshots(manager: Pick<EntityManager, 'query'>, userId: string) {
    let afterId = FIRST_UUID
    for (;;) {
        const quotes = await manager.query(
            `SELECT quote."id", quote."requestId", quote."providerId", quote."version"
               FROM "autocare_service_quotes" quote
               JOIN "autocare_service_requests" request ON request."id" = quote."requestId"
              WHERE request."clientId" = $1 AND quote."id" > $2::uuid
              ORDER BY quote."id" ASC LIMIT $3 FOR UPDATE OF quote`,
            [userId, afterId, BATCH_SIZE],
        ) as QuoteScope[]
        if (quotes.length === 0) return
        for (const quote of quotes) {
            const scope = serviceQuoteSnapshotContext(quote)
            const binding = createPlaintextRecordBinding('autocare_service_quotes', 'snapshot',
                serializeServiceQuoteSnapshot(REDACTED_SNAPSHOT), quote.id, scope)
            const encrypted = encryptRedactedFieldValue('autocare_service_quotes', 'snapshot', REDACTED_SNAPSHOT)
            const updated = await manager.query(
                `UPDATE "autocare_service_quotes"
                    SET "snapshot" = $1::jsonb, "snapshotBinding" = $2
                  WHERE "id" = $3::uuid AND "requestId" = $4::uuid AND "providerId" = $5::uuid
                    AND "version" = $6 RETURNING "id"`,
                [encrypted, binding, quote.id, quote.requestId, quote.providerId, quote.version],
            ) as [Array<{ id: string }>, number]
            if (updated[1] !== 1 || updated[0].length !== 1) {
                throw new Error('Service quote snapshot changed during account redaction.')
            }
        }
        afterId = quotes.at(-1)!.id
        if (quotes.length < BATCH_SIZE) return
    }
}
