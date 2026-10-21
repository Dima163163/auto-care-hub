import type { MigrationInterface, QueryRunner } from 'typeorm'

import { outboxPayloadEncryptionTransformer } from '../../shared/security/data-encryption/field-encryption.js'

type OutboxRow = { id: string; payload: Record<string, unknown> }

export class EncryptRawOutboxRecipients1786420000000 implements MigrationInterface {
    name = 'EncryptRawOutboxRecipients1786420000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Older raw enqueue calls bypassed the entity transformer after the
        // original encryption migration. Process only rows with plaintext
        // recipient fields; the transaction keeps the scan and updates atomic.
        while (true) {
            const rows = await queryRunner.query(
                `SELECT "id", "payload" FROM "outbox_events"
                  WHERE (jsonb_typeof("payload" -> 'email') = 'string' AND NOT ("payload" ? 'emailCiphertext'))
                     OR (jsonb_typeof("payload" -> 'toEmail') = 'string' AND NOT ("payload" ? 'toEmailCiphertext'))
                     OR (jsonb_typeof("payload" -> 'recipientName') = 'string' AND NOT ("payload" ? 'recipientNameCiphertext'))
                  ORDER BY "id" LIMIT 500 FOR UPDATE`,
            ) as OutboxRow[]
            if (rows.length === 0) break

            for (const row of rows) {
                // A row can mix old plaintext and already encrypted fields.
                // Decode the latter before applying the transformer once.
                const plaintext = outboxPayloadEncryptionTransformer.from(row.payload)
                const encrypted = outboxPayloadEncryptionTransformer.to(plaintext)
                await queryRunner.query(
                    `UPDATE "outbox_events" SET "payload" = $1::jsonb WHERE "id" = $2`,
                    [JSON.stringify(encrypted), row.id],
                )
            }
        }
    }

    public async down(): Promise<void> {
        // Keep recipient data encrypted if the application migration is rolled back.
    }
}
