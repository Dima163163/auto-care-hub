import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RedactLegacyOutboxTokenPayloads1785470000000 implements MigrationInterface {
    name = 'RedactLegacyOutboxTokenPayloads1785470000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "outbox_events"
            SET
                "payload" = "payload" - 'token',
                "status" = CASE
                    WHEN "status" IN ('pending', 'processing', 'failed')
                        THEN 'dead_letter'::"public"."outbox_event_status"
                    ELSE "status"
                END,
                "lockedAt" = CASE
                    WHEN "status" IN ('pending', 'processing', 'failed') THEN NULL
                    ELSE "lockedAt"
                END,
                "lastError" = CASE
                    WHEN "status" IN ('pending', 'processing', 'failed')
                        THEN 'Legacy auth token payload redacted by migration 1785470000000.'
                    ELSE "lastError"
                END
            WHERE "type" = 'email.send'
              AND "payload"->>'template' IN ('password_reset', 'password_setup', 'email_verification')
              AND "payload" ? 'token'
        `)
    }

    async down(_queryRunner: QueryRunner): Promise<void> {
        // Redacted token material cannot be safely reconstructed.
    }
}
