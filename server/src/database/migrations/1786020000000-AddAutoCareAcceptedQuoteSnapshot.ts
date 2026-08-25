import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareAcceptedQuoteSnapshot1786020000000 implements MigrationInterface {
    name = 'AddAutoCareAcceptedQuoteSnapshot1786020000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "acceptedQuoteVersion" integer`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "acceptedQuoteSnapshot" jsonb`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "acceptedQuoteAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "CHK_autocare_requests_accepted_quote_version" CHECK ("acceptedQuoteVersion" IS NULL OR "acceptedQuoteVersion" > 0) NOT VALID`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "CHK_autocare_requests_accepted_quote_version"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "acceptedQuoteAt"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "acceptedQuoteSnapshot"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "acceptedQuoteVersion"`)
    }
}
