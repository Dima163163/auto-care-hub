import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingIdempotencyKey1784183100000 implements MigrationInterface {
    name = 'AddBookingIdempotencyKey1784183100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "bookings" ADD "idempotency_key" character varying(128)',
        )
        await queryRunner.query(
            'CREATE UNIQUE INDEX "IDX_bookings_client_idempotency_key" ON "bookings" ("clientId", "idempotency_key")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_bookings_client_idempotency_key"')
        await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "idempotency_key"')
    }
}
