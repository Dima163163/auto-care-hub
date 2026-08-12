import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateStripeWebhookEvents1784183000000 implements MigrationInterface {
    name = 'CreateStripeWebhookEvents1784183000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "stripe_webhook_event_status" AS ENUM ('processing', 'processed', 'failed')
        `)
        await queryRunner.query(`
            CREATE TABLE "stripe_webhook_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "stripe_event_id" text NOT NULL,
                "event_type" text NOT NULL,
                "status" "stripe_webhook_event_status" NOT NULL DEFAULT 'processing',
                "processed_at" TIMESTAMP WITH TIME ZONE,
                "last_error" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_stripe_webhook_events_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_stripe_webhook_events_event_id" UNIQUE ("stripe_event_id")
            )
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_stripe_webhook_events_status_created_at" ON "stripe_webhook_events" ("status", "created_at")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_stripe_webhook_events_status_created_at"')
        await queryRunner.query('DROP TABLE "stripe_webhook_events"')
        await queryRunner.query('DROP TYPE "stripe_webhook_event_status"')
    }
}
