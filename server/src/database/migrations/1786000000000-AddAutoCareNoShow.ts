import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareNoShow1786000000000 implements MigrationInterface {
    name = 'AddAutoCareNoShow1786000000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "autocare_service_request_status" ADD VALUE IF NOT EXISTS 'no_show'`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "noShowAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "noShowById" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "noShowReason" text`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "FK_autocare_requests_no_show_by" FOREIGN KEY ("noShowById") REFERENCES "users"("id") ON DELETE SET NULL NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "CHK_autocare_requests_no_show_reason" CHECK ("noShowReason" IS NULL OR char_length("noShowReason") <= 1000) NOT VALID`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "CHK_autocare_requests_no_show_reason"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "FK_autocare_requests_no_show_by"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "noShowReason"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "noShowById"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "noShowAt"`)
    }
}
