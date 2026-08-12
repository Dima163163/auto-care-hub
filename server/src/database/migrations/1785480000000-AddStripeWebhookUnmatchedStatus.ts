import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStripeWebhookUnmatchedStatus1785480000000 implements MigrationInterface {
    name = 'AddStripeWebhookUnmatchedStatus1785480000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."stripe_webhook_event_status" ADD VALUE IF NOT EXISTS 'unmatched'`,
        )
    }

    async down(_queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not safely remove enum values in a reversible migration.
    }
}
