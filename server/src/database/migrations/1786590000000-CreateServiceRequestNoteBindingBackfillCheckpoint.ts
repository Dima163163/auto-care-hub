import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateServiceRequestNoteBindingBackfillCheckpoint1786590000000 implements MigrationInterface {
    name = 'CreateServiceRequestNoteBindingBackfillCheckpoint1786590000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_requests" ADD "noteBinding" text')
        await queryRunner.query(`CREATE TABLE "service_request_note_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "service_request_note_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_service_requests" DROP COLUMN "noteBinding"')
    }
}
