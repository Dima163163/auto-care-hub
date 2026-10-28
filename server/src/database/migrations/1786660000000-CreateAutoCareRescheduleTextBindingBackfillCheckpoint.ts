import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareRescheduleTextBindingBackfillCheckpoint1786660000000 implements MigrationInterface {
    name = 'CreateAutoCareRescheduleTextBindingBackfillCheckpoint1786660000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_reschedule_requests" ADD "reasonBinding" text, ADD "resolutionReasonBinding" text')
        await queryRunner.query(`CREATE TABLE "autocare_reschedule_text_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "autocare_reschedule_text_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_reschedule_requests" DROP COLUMN "reasonBinding", DROP COLUMN "resolutionReasonBinding"')
    }
}
