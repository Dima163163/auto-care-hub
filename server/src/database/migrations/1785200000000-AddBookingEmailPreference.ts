import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingEmailPreference1785200000000 implements MigrationInterface {
    name = 'AddBookingEmailPreference1785200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "users" ADD "bookingEmailNotifications" boolean NOT NULL DEFAULT true',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "users" DROP COLUMN "bookingEmailNotifications"',
        )
    }
}
