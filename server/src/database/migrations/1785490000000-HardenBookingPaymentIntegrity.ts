import type { MigrationInterface, QueryRunner } from 'typeorm'

type CountRow = { count: string | number }

export class HardenBookingPaymentIntegrity1785490000000 implements MigrationInterface {
    name = 'HardenBookingPaymentIntegrity1785490000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        const orphanRows = await queryRunner.query(`
            SELECT COUNT(*)::int AS "count"
            FROM "booking_payments" payment
            LEFT JOIN "bookings" booking ON booking."id" = payment."bookingId"
            WHERE booking."id" IS NULL
        `) as CountRow[]
        const orphanCount = Number(orphanRows[0]?.count ?? 0)

        if (!Number.isSafeInteger(orphanCount) || orphanCount < 0) {
            throw new Error('Booking payment orphan preflight returned an invalid count.')
        }

        if (orphanCount > 0) {
            throw new Error(
                `Cannot add booking payment referential integrity: ${orphanCount} orphan payment row(s) require reconciliation.`,
            )
        }

        await queryRunner.query(`
            ALTER TABLE "booking_payments"
            ADD CONSTRAINT "FK_booking_payments_booking"
            FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT
        `)
        await queryRunner.query(
            'ALTER TABLE "booking_payment_invoices" DROP CONSTRAINT "FK_booking_payment_invoices_payment"',
        )
        await queryRunner.query(`
            ALTER TABLE "booking_payment_invoices"
            ADD CONSTRAINT "FK_booking_payment_invoices_payment"
            FOREIGN KEY ("payment_id") REFERENCES "booking_payments"("id") ON DELETE RESTRICT
        `)
        await queryRunner.query(
            'ALTER TABLE "booking_payment_invoices" DROP CONSTRAINT "FK_booking_payment_invoices_booking"',
        )
        await queryRunner.query(`
            ALTER TABLE "booking_payment_invoices"
            ADD CONSTRAINT "FK_booking_payment_invoices_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "booking_payments" DROP CONSTRAINT "FK_booking_payments_booking"',
        )
        await queryRunner.query(
            'ALTER TABLE "booking_payment_invoices" DROP CONSTRAINT "FK_booking_payment_invoices_payment"',
        )
        await queryRunner.query(`
            ALTER TABLE "booking_payment_invoices"
            ADD CONSTRAINT "FK_booking_payment_invoices_payment"
            FOREIGN KEY ("payment_id") REFERENCES "booking_payments"("id") ON DELETE CASCADE
        `)
        await queryRunner.query(
            'ALTER TABLE "booking_payment_invoices" DROP CONSTRAINT "FK_booking_payment_invoices_booking"',
        )
        await queryRunner.query(`
            ALTER TABLE "booking_payment_invoices"
            ADD CONSTRAINT "FK_booking_payment_invoices_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE
        `)
    }
}
