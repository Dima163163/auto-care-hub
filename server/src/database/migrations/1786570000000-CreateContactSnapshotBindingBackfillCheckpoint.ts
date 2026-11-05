import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateContactSnapshotBindingBackfillCheckpoint1786570000000 implements MigrationInterface {
    name = 'CreateContactSnapshotBindingBackfillCheckpoint1786570000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_requests" ADD "contactSnapshotBinding" text')
        await queryRunner.query(`CREATE TABLE "contact_snapshot_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "contact_snapshot_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_service_requests" DROP COLUMN "contactSnapshotBinding"')
    }
}
