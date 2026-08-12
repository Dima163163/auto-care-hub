import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingPaymentInvoices1785450000000 implements MigrationInterface {
    name = 'CreateBookingPaymentInvoices1785450000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "booking_payment_invoice_status" AS ENUM ('open', 'paid', 'void')
        `)
        await queryRunner.query(`
            CREATE TABLE "booking_payment_invoices" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "payment_id" uuid NOT NULL,
                "booking_id" uuid NOT NULL,
                "invoice_id" text NOT NULL,
                "amount" integer NOT NULL,
                "currency" text NOT NULL,
                "status" "booking_payment_invoice_status" NOT NULL,
                "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_booking_payment_invoices_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_booking_payment_invoices_payment_id" UNIQUE ("payment_id"),
                CONSTRAINT "UQ_booking_payment_invoices_invoice_id" UNIQUE ("invoice_id"),
                CONSTRAINT "FK_booking_payment_invoices_payment"
                    FOREIGN KEY ("payment_id") REFERENCES "booking_payments"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_booking_payment_invoices_booking"
                    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
                CONSTRAINT "CHK_booking_payment_invoices_amount" CHECK ("amount" >= 0)
            )
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_booking_payment_invoices_status_issued_at" ON "booking_payment_invoices" ("status", "issued_at", "id")',
        )
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_booking_payment_invoices_status_issued_at"')
        await queryRunner.query('DROP TABLE "booking_payment_invoices"')
        await queryRunner.query('DROP TYPE "booking_payment_invoice_status"')
    }
}
