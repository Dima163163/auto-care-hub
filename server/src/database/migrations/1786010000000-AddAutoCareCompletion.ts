import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareCompletion1786010000000 implements MigrationInterface {
    name = 'AddAutoCareCompletion1786010000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "completedAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "completedById" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "completionNote" text`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "FK_autocare_requests_completed_by" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "CHK_autocare_requests_completion_note" CHECK ("completionNote" IS NULL OR char_length("completionNote") <= 1000) NOT VALID`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "CHK_autocare_requests_completion_note"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "FK_autocare_requests_completed_by"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "completionNote"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "completedById"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "completedAt"`)
    }
}
