import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingPaymentRefundedAmount1785500000000 implements MigrationInterface {
    name = 'AddBookingPaymentRefundedAmount1785500000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."booking_payments_status_enum" ADD VALUE IF NOT EXISTS 'partially_refunded'`,
        )
        await queryRunner.query(
            `ALTER TABLE "booking_payments" ADD "refunded_amount" integer NOT NULL DEFAULT 0`,
        )
        await queryRunner.query(`
            ALTER TABLE "booking_payments"
            ADD CONSTRAINT "CHK_booking_payments_refunded_amount"
            CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= ("grossAmount" * 100))
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "booking_payments" DROP CONSTRAINT "CHK_booking_payments_refunded_amount"',
        )
        await queryRunner.query(
            'ALTER TABLE "booking_payments" DROP COLUMN "refunded_amount"',
        )
        // PostgreSQL enum values cannot be removed safely in a forward-only release.
    }
}
