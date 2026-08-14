import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareLocationModel1785880000000 implements MigrationInterface {
    name = 'CreateAutoCareLocationModel1785880000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_markets" ADD "regionCode" text`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" ADD "regionName" text`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" ADD "centerLatitude" numeric(10,7)`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" ADD "centerLongitude" numeric(10,7)`)
        await queryRunner.query(`CREATE TYPE "public"."autocare_location_zone_type" AS ENUM('district', 'neighborhood', 'service_area')`)
        await queryRunner.query(`CREATE TABLE "autocare_location_zones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "marketId" uuid NOT NULL, "parentId" uuid, "slug" text NOT NULL, "zoneType" "public"."autocare_location_zone_type" NOT NULL, "names" jsonb NOT NULL DEFAULT '{}', "centerLatitude" numeric(10,7), "centerLongitude" numeric(10,7), "radiusKm" numeric(7,2), "imageUrl" text, "displayOrder" integer NOT NULL DEFAULT 0, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_autocare_location_zones_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_autocare_location_zones_market_slug" UNIQUE ("marketId", "slug"), CONSTRAINT "FK_autocare_location_zones_market" FOREIGN KEY ("marketId") REFERENCES "autocare_markets"("id") ON DELETE CASCADE, CONSTRAINT "FK_autocare_location_zones_parent" FOREIGN KEY ("parentId") REFERENCES "autocare_location_zones"("id") ON DELETE CASCADE)`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_location_zones_market_parent_active" ON "autocare_location_zones" ("marketId", "parentId", "active")`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "zoneId" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD CONSTRAINT "FK_autocare_locations_zone" FOREIGN KEY ("zoneId") REFERENCES "autocare_location_zones"("id") ON DELETE SET NULL`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_locations_zone" ON "autocare_service_locations" ("zoneId")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_locations_zone"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP CONSTRAINT "FK_autocare_locations_zone"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "zoneId"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_location_zones_market_parent_active"`)
        await queryRunner.query(`DROP TABLE "autocare_location_zones"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_location_zone_type"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" DROP COLUMN "centerLongitude"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" DROP COLUMN "centerLatitude"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" DROP COLUMN "regionName"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" DROP COLUMN "regionCode"`)
    }
}
