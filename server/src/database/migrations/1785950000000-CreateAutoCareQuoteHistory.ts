import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareQuoteHistory1785950000000 implements MigrationInterface {
    name = 'CreateAutoCareQuoteHistory1785950000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "autocare_service_quotes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requestId" uuid NOT NULL, "providerId" uuid NOT NULL, "version" integer NOT NULL, "amountMinor" integer NOT NULL, "currencyCode" text NOT NULL, "snapshot" jsonb NOT NULL, "validUntil" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_service_quotes" PRIMARY KEY ("id"), CONSTRAINT "CHK_autocare_service_quotes_amount" CHECK ("amountMinor" >= 0))`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_service_quotes_request_version" ON "autocare_service_quotes" ("requestId", "version")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_service_quotes_provider_created" ON "autocare_service_quotes" ("providerId", "createdAt")`)
        await queryRunner.query(`ALTER TABLE "autocare_service_quotes" ADD CONSTRAINT "FK_autocare_service_quotes_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE CASCADE NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_quotes" ADD CONSTRAINT "FK_autocare_service_quotes_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE RESTRICT NOT VALID`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_quotes" DROP CONSTRAINT "FK_autocare_service_quotes_provider"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_quotes" DROP CONSTRAINT "FK_autocare_service_quotes_request"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_service_quotes_provider_created"`)
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_service_quotes_request_version"`)
        await queryRunner.query(`DROP TABLE "autocare_service_quotes"`)
    }
}
