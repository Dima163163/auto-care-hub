import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Geospatial MVP alternative for the stock postgres: indexed bounding-box
 * filtering narrows candidates in SQL, then the service applies an exact
 * great-circle distance check. This keeps the API deployable on postgres:17-
 * alpine while leaving a clean path to PostGIS later.
 */
export class AddAutoCareGeoIndexes1786120000000 implements MigrationInterface {
    name = 'AddAutoCareGeoIndexes1786120000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE INDEX "IDX_autocare_locations_market_latitude" ON "autocare_service_locations" ("marketId", "latitude") WHERE "latitude" IS NOT NULL')
        await queryRunner.query('CREATE INDEX "IDX_autocare_locations_market_longitude" ON "autocare_service_locations" ("marketId", "longitude") WHERE "longitude" IS NOT NULL')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_autocare_locations_market_longitude"')
        await queryRunner.query('DROP INDEX "public"."IDX_autocare_locations_market_latitude"')
    }
}
