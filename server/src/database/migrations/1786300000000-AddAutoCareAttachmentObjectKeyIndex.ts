import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareAttachmentObjectKeyIndex1786300000000 implements MigrationInterface {
    name = 'AddAutoCareAttachmentObjectKeyIndex1786300000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_autocare_attachments_object_key" ON "autocare_service_attachments" ("objectKey")`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_autocare_attachments_object_key"`)
    }
}
