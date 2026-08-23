import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareBookingSnapshot1786050000000 implements MigrationInterface {
    name = 'AddAutoCareBookingSnapshot1786050000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_requests" ADD "bookingSnapshot" jsonb')
        await queryRunner.query('ALTER TABLE "autocare_service_requests" ADD "bookingCreatedAt" TIMESTAMP WITH TIME ZONE')
        await queryRunner.query('CREATE UNIQUE INDEX "UQ_autocare_reviews_service_request" ON "autocare_reviews" ("serviceRequestId") WHERE "serviceRequestId" IS NOT NULL')
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."UQ_autocare_reviews_service_request"')
        await queryRunner.query('ALTER TABLE "autocare_service_requests" DROP COLUMN "bookingCreatedAt"')
        await queryRunner.query('ALTER TABLE "autocare_service_requests" DROP COLUMN "bookingSnapshot"')
    }
}
