import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareMarketHierarchy1786190000000 implements MigrationInterface {
    name = 'CreateAutoCareMarketHierarchy1786190000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "autocare_market_countries" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "code" text NOT NULL,
            "names" jsonb NOT NULL DEFAULT '{}',
            "defaultLocale" text NOT NULL,
            "supportedLocales" text array NOT NULL DEFAULT '{}',
            "timezone" text NOT NULL,
            "currencyCode" text NOT NULL,
            "capabilities" jsonb NOT NULL DEFAULT '{}',
            "legalLinks" jsonb NOT NULL DEFAULT '{}',
            "active" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_market_countries_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_autocare_market_countries_code" UNIQUE ("code")
        )`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" ADD "countryId" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" ADD "capabilities" jsonb NOT NULL DEFAULT '{}'`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" ADD "legalLinks" jsonb NOT NULL DEFAULT '{}'`)
        await queryRunner.query(`INSERT INTO "autocare_market_countries" ("code", "names", "defaultLocale", "supportedLocales", "timezone", "currencyCode")
            SELECT DISTINCT ON ("countryCode") "countryCode", jsonb_build_object('en', "countryName"), "defaultLocale", "supportedLocales", "timezone", "currencyCode"
            FROM "autocare_markets"
            ORDER BY "countryCode", "id"`)
        await queryRunner.query(`UPDATE "autocare_markets" AS market
            SET "countryId" = country."id"
            FROM "autocare_market_countries" AS country
            WHERE country."code" = market."countryCode"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" ALTER COLUMN "countryId" SET NOT NULL`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" ADD CONSTRAINT "FK_autocare_markets_country" FOREIGN KEY ("countryId") REFERENCES "autocare_market_countries"("id") ON DELETE RESTRICT`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_markets_country" ON "autocare_markets" ("countryId", "cityName")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_markets_country"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" DROP CONSTRAINT "FK_autocare_markets_country"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" DROP COLUMN "legalLinks"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" DROP COLUMN "capabilities"`)
        await queryRunner.query(`ALTER TABLE "autocare_markets" DROP COLUMN "countryId"`)
        await queryRunner.query(`DROP TABLE "autocare_market_countries"`)
    }
}
