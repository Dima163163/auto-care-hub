import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareCapacityReservationIndex1786170000000 implements MigrationInterface {
    name = 'AddAutoCareCapacityReservationIndex1786170000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX "IDX_autocare_requests_capacity_reservations"
            ON "autocare_service_requests" ("providerId", "locationId", "preferredAt")
            WHERE "status" = 'accepted' AND "preferredAt" IS NOT NULL
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_autocare_requests_capacity_reservations"')
    }
}
