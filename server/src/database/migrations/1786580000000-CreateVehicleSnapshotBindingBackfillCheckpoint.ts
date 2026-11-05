import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateVehicleSnapshotBindingBackfillCheckpoint1786580000000 implements MigrationInterface {
    name = 'CreateVehicleSnapshotBindingBackfillCheckpoint1786580000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_requests" ADD "vehicleSnapshotBinding" text')
        await queryRunner.query(`CREATE TABLE "vehicle_snapshot_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "vehicle_snapshot_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_service_requests" DROP COLUMN "vehicleSnapshotBinding"')
    }
}
