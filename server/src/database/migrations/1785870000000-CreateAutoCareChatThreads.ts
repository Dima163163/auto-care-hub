import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareChatThreads1785870000000 implements MigrationInterface {
    name = 'CreateAutoCareChatThreads1785870000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."autocare_chat_thread_type" AS ENUM('service_request', 'provider_inquiry', 'support', 'admin_escalation')`)
        await queryRunner.query(`CREATE TYPE "public"."autocare_chat_thread_status" AS ENUM('open', 'closed')`)
        await queryRunner.query(`CREATE TABLE "autocare_chat_threads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."autocare_chat_thread_type" NOT NULL, "requestId" uuid, "providerId" uuid, "clientId" uuid, "createdById" uuid, "subject" text NOT NULL, "status" "public"."autocare_chat_thread_status" NOT NULL DEFAULT 'open', "lastMessageAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_chat_threads" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_threads_client" ON "autocare_chat_threads" ("clientId", "status", "updatedAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_threads_provider" ON "autocare_chat_threads" ("providerId", "status", "updatedAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_threads_type" ON "autocare_chat_threads" ("type", "status", "updatedAt")`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ALTER COLUMN "requestId" DROP NOT NULL`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD COLUMN "threadId" uuid`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_messages_thread_created" ON "autocare_service_messages" ("threadId", "createdAt")`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ALTER COLUMN "requestId" DROP NOT NULL`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD COLUMN "threadId" uuid`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_attachments_thread_created" ON "autocare_service_attachments" ("threadId", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_attachments_thread_created"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP COLUMN "threadId"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ALTER COLUMN "requestId" SET NOT NULL`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_messages_thread_created"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP COLUMN "threadId"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ALTER COLUMN "requestId" SET NOT NULL`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_threads_type"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_threads_provider"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_threads_client"`)
        await queryRunner.query(`DROP TABLE "autocare_chat_threads"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_chat_thread_status"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_chat_thread_type"`)
    }
}
