import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateServiceRequestOutcomeBindingBackfillCheckpoint1786620000000 implements MigrationInterface {
    name = 'CreateServiceRequestOutcomeBindingBackfillCheckpoint1786620000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_requests" ADD "cancellationReasonBinding" text, ADD "noShowReasonBinding" text, ADD "completionNoteBinding" text')
        await queryRunner.query(`CREATE TABLE "service_request_outcome_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "service_request_outcome_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_service_requests" DROP COLUMN "cancellationReasonBinding", DROP COLUMN "noShowReasonBinding", DROP COLUMN "completionNoteBinding"')
    }
}
