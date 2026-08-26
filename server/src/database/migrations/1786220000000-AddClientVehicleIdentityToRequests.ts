import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddClientVehicleIdentityToRequests1786220000000 implements MigrationInterface {
    name = 'AddClientVehicleIdentityToRequests1786220000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_vehicles" ADD COLUMN IF NOT EXISTS "licensePlate" text`)
        await queryRunner.query(`ALTER TABLE "client_vehicles" ADD COLUMN IF NOT EXISTS "internalNumber" text`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD COLUMN IF NOT EXISTS "vehicleId" uuid`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_autocare_service_requests_vehicle" ON "autocare_service_requests" ("clientId", "vehicleId", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_autocare_service_requests_vehicle"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN IF EXISTS "vehicleId"`)
        await queryRunner.query(`ALTER TABLE "client_vehicles" DROP COLUMN IF EXISTS "internalNumber"`)
        await queryRunner.query(`ALTER TABLE "client_vehicles" DROP COLUMN IF EXISTS "licensePlate"`)
    }
}
