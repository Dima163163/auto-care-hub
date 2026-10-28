import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRepairEventBindingBackfillCheckpoint1786740000000 implements MigrationInterface {
    name = 'CreateRepairEventBindingBackfillCheckpoint1786740000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_repair_events" ADD "titleBinding" text, ADD "notesBinding" text, ADD "metadataBinding" text')
        await queryRunner.query(`CREATE TABLE "repair_event_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "repair_event_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_repair_events" DROP COLUMN "titleBinding", DROP COLUMN "notesBinding", DROP COLUMN "metadataBinding"')
    }
}
