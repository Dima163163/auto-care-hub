import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareLocationAppointmentCapacity1786160000000 implements MigrationInterface {
    name = 'AddAutoCareLocationAppointmentCapacity1786160000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_locations" ADD COLUMN "appointmentCapacity" integer NOT NULL DEFAULT 1')
        await queryRunner.query('ALTER TABLE "autocare_service_locations" ADD CONSTRAINT "CHK_autocare_service_location_appointment_capacity" CHECK ("appointmentCapacity" BETWEEN 1 AND 1000) NOT VALID')
        await queryRunner.query('ALTER TABLE "autocare_service_locations" VALIDATE CONSTRAINT "CHK_autocare_service_location_appointment_capacity"')
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_locations" DROP CONSTRAINT IF EXISTS "CHK_autocare_service_location_appointment_capacity"')
        await queryRunner.query('ALTER TABLE "autocare_service_locations" DROP COLUMN IF EXISTS "appointmentCapacity"')
    }
}
