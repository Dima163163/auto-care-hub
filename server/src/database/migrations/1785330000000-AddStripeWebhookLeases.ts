import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStripeWebhookLeases1785330000000 implements MigrationInterface {
    name = 'AddStripeWebhookLeases1785330000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "stripe_webhook_events" ADD "lease_token" text',
        )
        await queryRunner.query(
            'ALTER TABLE "stripe_webhook_events" ADD "lease_expires_at" TIMESTAMP WITH TIME ZONE',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_stripe_webhook_events_status_lease" ON "stripe_webhook_events" ("status", "lease_expires_at")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_stripe_webhook_events_status_lease"')
        await queryRunner.query(
            'ALTER TABLE "stripe_webhook_events" DROP COLUMN "lease_expires_at"',
        )
        await queryRunner.query(
            'ALTER TABLE "stripe_webhook_events" DROP COLUMN "lease_token"',
        )
    }
}
