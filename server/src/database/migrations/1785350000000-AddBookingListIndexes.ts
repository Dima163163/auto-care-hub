import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBookingListIndexes1785350000000 implements MigrationInterface {
    name = 'AddBookingListIndexes1785350000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE INDEX "IDX_bookings_client_schedule" ON "bookings" ("clientId", "date", "startTime", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_cabinets_owner_created_at" ON "cabinets" ("ownerId", "createdAt", "id")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_cabinets_owner_created_at"')
        await queryRunner.query('DROP INDEX "public"."IDX_bookings_client_schedule"')
    }
}
