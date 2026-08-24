import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Complements the portable latitude/longitude indexes with the exact prefixes
 * used by the public offering-first discovery query. This keeps the launch
 * strategy deployable on stock PostgreSQL while preserving a future PostGIS
 * cutover path.
 */
export class OptimizeAutoCareDiscoveryIndexes1786150000000 implements MigrationInterface {
    name = 'OptimizeAutoCareDiscoveryIndexes1786150000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE INDEX "IDX_autocare_locations_market_latitude_longitude" ON "autocare_service_locations" ("marketId", "latitude", "longitude") WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL')
        await queryRunner.query('CREATE INDEX "IDX_autocare_offerings_discovery_active" ON "autocare_service_offerings" ("definitionId", "locationId", "priceFromMinor") WHERE "active" = true')
        await queryRunner.query('CREATE INDEX "IDX_autocare_providers_discovery_active_rating" ON "autocare_providers" ("status", "rating" DESC, "id") WHERE "status" = \'active\'')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_autocare_providers_discovery_active_rating"')
        await queryRunner.query('DROP INDEX "public"."IDX_autocare_offerings_discovery_active"')
        await queryRunner.query('DROP INDEX "public"."IDX_autocare_locations_market_latitude_longitude"')
    }
}
