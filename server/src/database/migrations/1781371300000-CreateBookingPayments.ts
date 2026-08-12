import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingPayments1781371300000 implements MigrationInterface {
    name = 'CreateBookingPayments1781371300000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."booking_payments_status_enum" AS ENUM('pending', 'paid', 'failed', 'refunded')`)
        await queryRunner.query(`CREATE TABLE "booking_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" uuid NOT NULL, "grossAmount" integer NOT NULL, "commissionAmount" integer NOT NULL, "ownerPayoutAmount" integer NOT NULL, "currency" text NOT NULL DEFAULT 'eur', "status" "public"."booking_payments_status_enum" NOT NULL DEFAULT 'pending', "stripeSessionId" text, "stripePaymentIntentId" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_booking_payments" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_booking_payments_booking" ON "booking_payments" ("bookingId")`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_booking_payments_booking"`)
        await queryRunner.query(`DROP TABLE "booking_payments"`)
        await queryRunner.query(`DROP TYPE "public"."booking_payments_status_enum"`)
    }
}
