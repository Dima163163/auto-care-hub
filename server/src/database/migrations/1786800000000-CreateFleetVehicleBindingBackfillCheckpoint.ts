import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateFleetVehicleBindingBackfillCheckpoint1786800000000 implements MigrationInterface {
    name = 'CreateFleetVehicleBindingBackfillCheckpoint1786800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_fleet_vehicles" ADD "labelBinding" text, ADD "vehicleSnapshotBinding" text')
        await queryRunner.query(`CREATE TABLE "fleet_vehicle_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "fleet_vehicle_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_fleet_vehicles" DROP COLUMN "labelBinding", DROP COLUMN "vehicleSnapshotBinding"')
    }
}
