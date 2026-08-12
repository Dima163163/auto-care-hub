import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingPaymentRefunds1785510000000 implements MigrationInterface {
    name = 'CreateBookingPaymentRefunds1785510000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."booking_payment_refund_status" AS ENUM('pending', 'succeeded', 'failed', 'canceled')`)
        await queryRunner.query(`CREATE TABLE "booking_payment_refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payment_id" uuid NOT NULL, "booking_id" uuid NOT NULL, "provider_refund_id" text NOT NULL, "provider_charge_id" text, "amount_minor" integer NOT NULL, "currency" text NOT NULL, "reason" text, "status" "public"."booking_payment_refund_status" NOT NULL DEFAULT 'succeeded', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_booking_payment_refunds" PRIMARY KEY ("id"), CONSTRAINT "CHK_booking_payment_refunds_amount" CHECK ("amount_minor" > 0), CONSTRAINT "FK_booking_payment_refunds_payment" FOREIGN KEY ("payment_id") REFERENCES "booking_payments"("id") ON DELETE RESTRICT, CONSTRAINT "FK_booking_payment_refunds_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT)`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_booking_payment_refunds_provider_id" ON "booking_payment_refunds" ("provider_refund_id")`)
        await queryRunner.query(`CREATE INDEX "IDX_booking_payment_refunds_payment_created" ON "booking_payment_refunds" ("payment_id", "created_at", "id")`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_booking_payment_refunds_payment_created"`)
        await queryRunner.query(`DROP INDEX "public"."UQ_booking_payment_refunds_provider_id"`)
        await queryRunner.query(`DROP TABLE "booking_payment_refunds"`)
        await queryRunner.query(`DROP TYPE "public"."booking_payment_refund_status"`)
    }
}
