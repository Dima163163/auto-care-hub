import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateClientVehicleBindingBackfillCheckpoint1786600000000 implements MigrationInterface {
    name = 'CreateClientVehicleBindingBackfillCheckpoint1786600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "client_vehicles" ADD "vinBinding" text, ADD "licensePlateBinding" text, ADD "internalNumberBinding" text, ADD "imageUrlBinding" text')
        await queryRunner.query(`CREATE TABLE "client_vehicle_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "client_vehicle_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "client_vehicles" DROP COLUMN "vinBinding", DROP COLUMN "licensePlateBinding", DROP COLUMN "internalNumberBinding", DROP COLUMN "imageUrlBinding"')
    }
}
