import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Enforce the private attachment contract for new rows while keeping legacy
 * data deployable. Existing rows are intentionally left NOT VALID until the
 * attachment backfill/validation runbook has repaired any historic records.
 */
export class HardenAutoCareAttachmentIntegrity1786280000000 implements MigrationInterface {
    name = 'HardenAutoCareAttachmentIntegrity1786280000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP CONSTRAINT IF EXISTS "CHK_autocare_attachments_parent"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD CONSTRAINT "CHK_autocare_attachments_parent" CHECK (("requestId" IS NOT NULL AND split_part("objectKey", '/', 1) = 'autocare-requests' AND split_part("objectKey", '/', 2) = "requestId") OR ("threadId" IS NOT NULL AND split_part("objectKey", '/', 1) = 'autocare-chats' AND split_part("objectKey", '/', 2) = "threadId")) NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD CONSTRAINT "CHK_autocare_attachments_content_type" CHECK ("contentType" IN ('image/jpeg', 'image/png', 'image/webp')) NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD CONSTRAINT "CHK_autocare_attachments_object_key" CHECK ("objectKey" ~ '^autocare-(requests|chats)/[a-f0-9-]{36}/[a-f0-9-]{36}[.]bin$') NOT VALID`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP CONSTRAINT IF EXISTS "CHK_autocare_attachments_object_key"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP CONSTRAINT IF EXISTS "CHK_autocare_attachments_content_type"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP CONSTRAINT IF EXISTS "CHK_autocare_attachments_parent"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD CONSTRAINT "CHK_autocare_attachments_parent" CHECK (("requestId" IS NOT NULL) OR ("threadId" IS NOT NULL)) NOT VALID`)
    }
}
