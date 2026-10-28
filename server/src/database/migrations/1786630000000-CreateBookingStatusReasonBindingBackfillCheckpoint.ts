import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingStatusReasonBindingBackfillCheckpoint1786630000000 implements MigrationInterface {
    name = 'CreateBookingStatusReasonBindingBackfillCheckpoint1786630000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "booking_status_history" ADD "reasonBinding" text')
        await queryRunner.query(`CREATE TABLE "booking_status_reason_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "booking_status_reason_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "booking_status_history" DROP COLUMN "reasonBinding"')
    }
}
