import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingRescheduleRequests1784000400000 implements MigrationInterface {
    name = 'CreateBookingRescheduleRequests1784000400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."booking_reschedule_status" AS ENUM('pending', 'accepted', 'rejected')`)
        await queryRunner.query(`CREATE TABLE "booking_reschedule_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" uuid NOT NULL, "requestedById" uuid NOT NULL, "proposedDate" date NOT NULL, "proposedStartTime" TIME NOT NULL, "proposedEndTime" TIME NOT NULL, "status" "public"."booking_reschedule_status" NOT NULL DEFAULT 'pending', "resolvedById" uuid, "resolutionReason" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resolvedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_booking_reschedule_time_range" CHECK ("proposedStartTime" < "proposedEndTime"), CONSTRAINT "PK_booking_reschedule_requests" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_booking_reschedule_pending" ON "booking_reschedule_requests" ("bookingId") WHERE "status" = 'pending'`)
        await queryRunner.query(`ALTER TABLE "booking_reschedule_requests" ADD CONSTRAINT "FK_booking_reschedule_booking" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE`)
        await queryRunner.query(`ALTER TABLE "booking_reschedule_requests" ADD CONSTRAINT "FK_booking_reschedule_requested_by" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT`)
        await queryRunner.query(`ALTER TABLE "booking_reschedule_requests" ADD CONSTRAINT "FK_booking_reschedule_resolved_by" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE RESTRICT`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "booking_reschedule_requests"`)
        await queryRunner.query(`DROP TYPE "public"."booking_reschedule_status"`)
    }
}
