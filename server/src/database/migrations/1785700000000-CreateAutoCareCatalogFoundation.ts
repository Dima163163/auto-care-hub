import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareCatalogFoundation1785700000000 implements MigrationInterface {
    name = 'CreateAutoCareCatalogFoundation1785700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."autocare_provider_status" AS ENUM('draft', 'active', 'suspended')`)
        await queryRunner.query(`CREATE TYPE "public"."autocare_price_type" AS ENUM('fixed', 'from', 'range', 'quote_required')`)
        await queryRunner.query(`CREATE TABLE "autocare_markets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "countryCode" text NOT NULL, "countryName" text NOT NULL, "cityCode" text NOT NULL, "cityName" text NOT NULL, "currencyCode" text NOT NULL, "defaultLocale" text NOT NULL, "supportedLocales" text array NOT NULL DEFAULT '{}', "timezone" text NOT NULL, "launchReady" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_autocare_markets_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_autocare_markets_country_city" UNIQUE ("countryCode", "cityCode"))`)
        await queryRunner.query(`CREATE TABLE "autocare_service_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" text NOT NULL, "categorySlug" text NOT NULL, "labels" jsonb NOT NULL DEFAULT '{}', "priceType" "public"."autocare_price_type" NOT NULL, "comparisonAttributes" jsonb NOT NULL DEFAULT '[]', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_autocare_service_definitions_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_autocare_service_definitions_slug" UNIQUE ("slug"))`)
        await queryRunner.query(`CREATE TABLE "autocare_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "description" text, "status" "public"."autocare_provider_status" NOT NULL DEFAULT 'draft', "verified" boolean NOT NULL DEFAULT false, "yearsActive" integer NOT NULL DEFAULT 0, "staffCount" integer NOT NULL DEFAULT 0, "rating" numeric(2,1) NOT NULL DEFAULT 0, "reviewCount" integer NOT NULL DEFAULT 0, "bonusSummary" text, "coverImageUrl" text, "galleryImageUrls" text array NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_providers_id" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE TABLE "autocare_service_locations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "marketId" uuid NOT NULL, "address" text NOT NULL, "hours" text NOT NULL, "latitude" numeric(10,7), "longitude" numeric(10,7), CONSTRAINT "PK_autocare_service_locations_id" PRIMARY KEY ("id"), CONSTRAINT "FK_autocare_locations_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE, CONSTRAINT "FK_autocare_locations_market" FOREIGN KEY ("marketId") REFERENCES "autocare_markets"("id") ON DELETE RESTRICT)`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_locations_market_provider" ON "autocare_service_locations" ("marketId", "providerId")`)
        await queryRunner.query(`CREATE TABLE "autocare_service_offerings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locationId" uuid NOT NULL, "definitionId" uuid NOT NULL, "priceFromMinor" integer NOT NULL, "priceToMinor" integer, "currencyCode" text NOT NULL, "durationMinutes" integer NOT NULL, "inclusions" jsonb NOT NULL DEFAULT '[]', "warrantyText" text, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_autocare_service_offerings_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_autocare_offerings_location_definition" UNIQUE ("locationId", "definitionId"), CONSTRAINT "CHK_autocare_offering_prices" CHECK ("priceFromMinor" >= 0 AND ("priceToMinor" IS NULL OR "priceToMinor" >= "priceFromMinor")), CONSTRAINT "FK_autocare_offerings_location" FOREIGN KEY ("locationId") REFERENCES "autocare_service_locations"("id") ON DELETE CASCADE, CONSTRAINT "FK_autocare_offerings_definition" FOREIGN KEY ("definitionId") REFERENCES "autocare_service_definitions"("id") ON DELETE RESTRICT)`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_providers_status_created" ON "autocare_providers" ("status", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "autocare_service_offerings"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_providers_status_created"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_locations_market_provider"`)
        await queryRunner.query(`DROP TABLE "autocare_service_locations"`)
        await queryRunner.query(`DROP TABLE "autocare_providers"`)
        await queryRunner.query(`DROP TABLE "autocare_service_definitions"`)
        await queryRunner.query(`DROP TABLE "autocare_markets"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_price_type"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_provider_status"`)
    }
}
