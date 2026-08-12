import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingOwnerNote1784000700000 implements MigrationInterface {
    name = 'AddBookingOwnerNote1784000700000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "bookings" ADD "ownerNote" text')
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "ownerNote"')
    }
}
