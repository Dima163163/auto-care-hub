import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareProviderDailyMetrics1786180000000 implements MigrationInterface {
    name = 'CreateAutoCareProviderDailyMetrics1786180000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "autocare_provider_daily_metrics" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providerId" uuid NOT NULL,
            "day" date NOT NULL,
            "impressions" integer NOT NULL DEFAULT 0,
            "profileOpens" integer NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_provider_daily_metrics_id" PRIMARY KEY ("id"),
            CONSTRAINT "CHK_autocare_provider_daily_metrics_nonnegative" CHECK ("impressions" >= 0 AND "profileOpens" >= 0),
            CONSTRAINT "FK_autocare_provider_daily_metrics_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_provider_daily_metrics_provider_day" ON "autocare_provider_daily_metrics" ("providerId", "day")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_provider_daily_metrics_provider_day"`)
        await queryRunner.query(`DROP TABLE "autocare_provider_daily_metrics"`)
    }
}
