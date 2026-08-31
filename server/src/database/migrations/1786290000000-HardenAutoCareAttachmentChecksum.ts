import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Keep attachment integrity metadata parseable at the database boundary.
 * Legacy rows are intentionally left NOT VALID until the storage backfill has
 * repaired missing or malformed checksums.
 */
export class HardenAutoCareAttachmentChecksum1786290000000 implements MigrationInterface {
    name = 'HardenAutoCareAttachmentChecksum1786290000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD CONSTRAINT "CHK_autocare_attachments_checksum" CHECK ("checksum" IS NULL OR "checksum" ~ '^[a-f0-9]{64}$') NOT VALID`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP CONSTRAINT IF EXISTS "CHK_autocare_attachments_checksum"`)
    }
}
