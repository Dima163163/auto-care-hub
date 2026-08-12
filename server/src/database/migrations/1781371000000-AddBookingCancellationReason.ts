import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingCancellationReason1781371000000 implements MigrationInterface {
    name = 'AddBookingCancellationReason1781371000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellationReason" text'
        )
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancellationReason"'
        )
    }
}
