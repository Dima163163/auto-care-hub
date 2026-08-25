import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareBookingMode1786060000000 implements MigrationInterface {
    name = 'AddAutoCareBookingMode1786060000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."autocare_booking_mode" AS ENUM('request', 'instant')`)
        await queryRunner.query(`ALTER TABLE "autocare_service_offerings" ADD "bookingMode" "public"."autocare_booking_mode" NOT NULL DEFAULT 'request'`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_offerings" DROP COLUMN "bookingMode"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_booking_mode"`)
    }
}
