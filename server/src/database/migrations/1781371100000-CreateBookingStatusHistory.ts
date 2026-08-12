import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingStatusHistory1781371100000 implements MigrationInterface {
    name = 'CreateBookingStatusHistory1781371100000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "booking_status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" uuid NOT NULL, "status" "public"."booking_status" NOT NULL, "changedById" uuid, "reason" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_booking_status_history" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE INDEX "IDX_booking_status_history_booking_created" ON "booking_status_history" ("bookingId", "createdAt")`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_booking_status_history_booking_created"`)
        await queryRunner.query(`DROP TABLE "booking_status_history"`)
    }
}
