import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareRequestCancellation1785980000000 implements MigrationInterface {
    name = 'AddAutoCareRequestCancellation1785980000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "autocare_service_request_status" ADD VALUE IF NOT EXISTS 'cancelled'`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "cancelledAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "cancelledById" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "cancellationReason" text`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "FK_autocare_requests_cancelled_by" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "CHK_autocare_requests_cancellation_reason" CHECK ("cancellationReason" IS NULL OR char_length("cancellationReason") <= 1000) NOT VALID`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "CHK_autocare_requests_cancellation_reason"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "FK_autocare_requests_cancelled_by"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "cancellationReason"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "cancelledById"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "cancelledAt"`)
        // PostgreSQL enum values are intentionally forward-only; the value is
        // harmless when rolling back the additive columns.
    }
}
