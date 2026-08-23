import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Attachment bytes moved to private object storage in the previous release.
 * Remove the legacy bytea column so future migrations cannot accidentally
 * reintroduce raw customer uploads into the relational database.
 */
export class DropAutoCareAttachmentContent1786140000000 implements MigrationInterface {
    name = 'DropAutoCareAttachmentContent1786140000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP COLUMN IF EXISTS "content"`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD COLUMN IF NOT EXISTS "content" bytea`)
    }
}
