import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingPaymentAttempts1785340000000 implements MigrationInterface {
    name = 'CreateBookingPaymentAttempts1785340000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "booking_payment_attempt_status" AS ENUM (
                'creating', 'created', 'failed', 'paid', 'expired'
            )
        `)
        await queryRunner.query(`
            CREATE TABLE "booking_payment_attempts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "payment_id" uuid NOT NULL,
                "booking_id" uuid NOT NULL,
                "attempt_number" integer NOT NULL,
                "idempotency_key" text NOT NULL,
                "client_idempotency_key" text,
                "status" "booking_payment_attempt_status" NOT NULL DEFAULT 'creating',
                "stripe_session_id" text,
                "checkout_url" text,
                "failure_message" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_booking_payment_attempts_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_booking_payment_attempts_payment_attempt_number"
                    UNIQUE ("payment_id", "attempt_number"),
                CONSTRAINT "UQ_booking_payment_attempts_idempotency_key"
                    UNIQUE ("idempotency_key"),
                CONSTRAINT "FK_booking_payment_attempts_payment"
                    FOREIGN KEY ("payment_id") REFERENCES "booking_payments"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_booking_payment_attempts_booking"
                    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
                CONSTRAINT "CHK_booking_payment_attempts_attempt_number"
                    CHECK ("attempt_number" > 0)
            )
        `)
        await queryRunner.query(
            'CREATE UNIQUE INDEX "UQ_booking_payment_attempts_stripe_session" ON "booking_payment_attempts" ("stripe_session_id") WHERE "stripe_session_id" IS NOT NULL',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_booking_payment_attempts_payment_created" ON "booking_payment_attempts" ("payment_id", "created_at")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_booking_payment_attempts_payment_created"')
        await queryRunner.query('DROP INDEX "public"."UQ_booking_payment_attempts_stripe_session"')
        await queryRunner.query('DROP TABLE "booking_payment_attempts"')
        await queryRunner.query('DROP TYPE "booking_payment_attempt_status"')
    }
}
