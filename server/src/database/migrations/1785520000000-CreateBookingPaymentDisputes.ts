import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingPaymentDisputes1785520000000 implements MigrationInterface {
    name = 'CreateBookingPaymentDisputes1785520000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."booking_payment_dispute_status" AS ENUM('open', 'funds_withdrawn', 'funds_reinstated', 'closed')`)
        await queryRunner.query(`CREATE TABLE "booking_payment_disputes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payment_id" uuid NOT NULL, "booking_id" uuid NOT NULL, "provider_dispute_id" text NOT NULL, "provider_charge_id" text, "amount_minor" integer NOT NULL, "currency" text NOT NULL, "reason" text NOT NULL, "provider_status" text NOT NULL, "status" "public"."booking_payment_dispute_status" NOT NULL, "last_event_id" text NOT NULL, "last_event_created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_booking_payment_disputes" PRIMARY KEY ("id"), CONSTRAINT "CHK_booking_payment_disputes_amount" CHECK ("amount_minor" > 0), CONSTRAINT "FK_booking_payment_disputes_payment" FOREIGN KEY ("payment_id") REFERENCES "booking_payments"("id") ON DELETE RESTRICT, CONSTRAINT "FK_booking_payment_disputes_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT)`)
        await queryRunner.query('CREATE UNIQUE INDEX "UQ_booking_payment_disputes_provider_id" ON "booking_payment_disputes" ("provider_dispute_id")')
        await queryRunner.query('CREATE INDEX "IDX_booking_payment_disputes_payment_created" ON "booking_payment_disputes" ("payment_id", "created_at", "id")')
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_booking_payment_disputes_payment_created"')
        await queryRunner.query('DROP INDEX "public"."UQ_booking_payment_disputes_provider_id"')
        await queryRunner.query('DROP TABLE "booking_payment_disputes"')
        await queryRunner.query('DROP TYPE "public"."booking_payment_dispute_status"')
    }
}
