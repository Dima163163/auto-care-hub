import type { MigrationInterface, QueryRunner } from 'typeorm'

export class EnhanceAutoCareServiceChat1785860000000 implements MigrationInterface {
    name = 'EnhanceAutoCareServiceChat1785860000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."autocare_service_message_kind" ADD VALUE IF NOT EXISTS 'offer'`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD COLUMN "offer" jsonb`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD COLUMN "deliveredAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD COLUMN "readAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_messages_request_read" ON "autocare_service_messages" ("requestId", "readAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_messages_request_read"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP COLUMN "readAt"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP COLUMN "deliveredAt"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP COLUMN "offer"`)
        await queryRunner.query(`ALTER TYPE "public"."autocare_service_message_kind" RENAME TO "autocare_service_message_kind_old"`)
        await queryRunner.query(`CREATE TYPE "public"."autocare_service_message_kind" AS ENUM('text', 'system')`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ALTER COLUMN "kind" TYPE "public"."autocare_service_message_kind" USING "kind"::text::"public"."autocare_service_message_kind"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_service_message_kind_old"`)
    }
}
