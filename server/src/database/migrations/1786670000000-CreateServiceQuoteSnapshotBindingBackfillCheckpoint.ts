import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateServiceQuoteSnapshotBindingBackfillCheckpoint1786670000000 implements MigrationInterface {
    name = 'CreateServiceQuoteSnapshotBindingBackfillCheckpoint1786670000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_quotes" ADD "snapshotBinding" text')
        await queryRunner.query(`CREATE TABLE "service_quote_snapshot_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "service_quote_snapshot_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_service_quotes" DROP COLUMN "snapshotBinding"')
    }
}
