import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateOutboxEvents1784000500000 implements MigrationInterface {
    name = 'CreateOutboxEvents1784000500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."outbox_event_status" AS ENUM('pending', 'processing', 'completed', 'failed')`)
        await queryRunner.query(`CREATE TABLE "outbox_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" text NOT NULL, "payload" jsonb NOT NULL, "idempotencyKey" text, "status" "public"."outbox_event_status" NOT NULL DEFAULT 'pending', "attempts" integer NOT NULL DEFAULT 0, "availableAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lockedAt" TIMESTAMP WITH TIME ZONE, "processedAt" TIMESTAMP WITH TIME ZONE, "lastError" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_outbox_idempotency_key" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_outbox_events" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE INDEX "IDX_outbox_status_available" ON "outbox_events" ("status", "availableAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "outbox_events"`)
        await queryRunner.query(`DROP TYPE "public"."outbox_event_status"`)
    }
}
