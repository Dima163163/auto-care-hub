import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Additive integrity hardening for the marketplace chat/review aggregates.
 * Existing rows are intentionally left NOT VALID so a deployment cannot fail
 * on legacy orphan data; the repair runbook can validate after backfill.
 */
export class HardenAutoCareRelations1785910000000 implements MigrationInterface {
    name = 'HardenAutoCareRelations1785910000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_chat_threads" ADD CONSTRAINT "FK_autocare_chat_threads_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE CASCADE NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_threads" ADD CONSTRAINT "FK_autocare_chat_threads_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE SET NULL NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_threads" ADD CONSTRAINT "FK_autocare_chat_threads_client" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_threads" ADD CONSTRAINT "FK_autocare_chat_threads_creator" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD CONSTRAINT "FK_autocare_messages_thread" FOREIGN KEY ("threadId") REFERENCES "autocare_chat_threads"("id") ON DELETE CASCADE NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD CONSTRAINT "CHK_autocare_messages_parent" CHECK (("requestId" IS NOT NULL) OR ("threadId" IS NOT NULL)) NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD CONSTRAINT "FK_autocare_attachments_thread" FOREIGN KEY ("threadId") REFERENCES "autocare_chat_threads"("id") ON DELETE CASCADE NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD CONSTRAINT "CHK_autocare_attachments_parent" CHECK (("requestId" IS NOT NULL) OR ("threadId" IS NOT NULL)) NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD CONSTRAINT "FK_autocare_reviews_client" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD CONSTRAINT "FK_autocare_reviews_request" FOREIGN KEY ("serviceRequestId") REFERENCES "autocare_service_requests"("id") ON DELETE SET NULL NOT VALID`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP CONSTRAINT "FK_autocare_reviews_request"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP CONSTRAINT "FK_autocare_reviews_client"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP CONSTRAINT "CHK_autocare_attachments_parent"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP CONSTRAINT "FK_autocare_attachments_thread"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP CONSTRAINT "CHK_autocare_messages_parent"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP CONSTRAINT "FK_autocare_messages_thread"`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_threads" DROP CONSTRAINT "FK_autocare_chat_threads_creator"`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_threads" DROP CONSTRAINT "FK_autocare_chat_threads_client"`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_threads" DROP CONSTRAINT "FK_autocare_chat_threads_provider"`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_threads" DROP CONSTRAINT "FK_autocare_chat_threads_request"`)
    }
}
