import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateFleetAccountBindingBackfillCheckpoint1786790000000 implements MigrationInterface {
    name = 'CreateFleetAccountBindingBackfillCheckpoint1786790000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_fleet_accounts" ADD "nameBinding" text, ADD "notesBinding" text')
        await queryRunner.query(`CREATE TABLE "fleet_account_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "fleet_account_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_fleet_accounts" DROP COLUMN "nameBinding", DROP COLUMN "notesBinding"')
    }
}
