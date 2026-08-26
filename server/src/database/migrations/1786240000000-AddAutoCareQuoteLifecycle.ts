import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareQuoteLifecycle1786240000000 implements MigrationInterface {
    name = 'AddAutoCareQuoteLifecycle1786240000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."autocare_quote_status" AS ENUM ('pending', 'accepted', 'declined', 'expired', 'superseded')`)
        await queryRunner.query(`ALTER TABLE "autocare_service_quotes" ADD "status" "public"."autocare_quote_status" NOT NULL DEFAULT 'pending'`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_service_quotes_status_valid_until" ON "autocare_service_quotes" ("status", "validUntil")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_service_quotes_status_valid_until"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_quotes" DROP COLUMN "status"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_quote_status"`)
    }
}
