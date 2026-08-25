import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareChatModeration1786110000000 implements MigrationInterface {
    name = 'CreateAutoCareChatModeration1786110000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "autocare_chat_report_category" AS ENUM ('spam', 'harassment', 'fraud', 'unsafe', 'other')`)
        await queryRunner.query(`CREATE TYPE "autocare_chat_report_status" AS ENUM ('pending', 'resolved', 'dismissed')`)
        await queryRunner.query(`CREATE TYPE "autocare_chat_block_status" AS ENUM ('active', 'revoked')`)
        await queryRunner.query(`CREATE TABLE "autocare_chat_reports" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "threadId" uuid NOT NULL,
            "reporterId" uuid NOT NULL,
            "reportedUserId" uuid,
            "category" "autocare_chat_report_category" NOT NULL,
            "description" text,
            "status" "autocare_chat_report_status" NOT NULL DEFAULT 'pending',
            "reviewedById" uuid,
            "resolutionReason" text,
            "reviewedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_chat_reports_id" PRIMARY KEY ("id"),
            CONSTRAINT "CHK_autocare_chat_reports_description" CHECK ("description" IS NULL OR char_length("description") BETWEEN 1 AND 2000),
            CONSTRAINT "CHK_autocare_chat_reports_reason" CHECK ("resolutionReason" IS NULL OR char_length("resolutionReason") BETWEEN 1 AND 2000),
            CONSTRAINT "FK_autocare_chat_reports_thread" FOREIGN KEY ("threadId") REFERENCES "autocare_chat_threads"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_chat_reports_reporter" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT,
            CONSTRAINT "FK_autocare_chat_reports_reported_user" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE SET NULL,
            CONSTRAINT "FK_autocare_chat_reports_reviewer" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_reports_status_created" ON "autocare_chat_reports" ("status", "createdAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_reports_thread_created" ON "autocare_chat_reports" ("threadId", "createdAt")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_chat_reports_reporter_thread" ON "autocare_chat_reports" ("threadId", "reporterId")`)
        await queryRunner.query(`CREATE TABLE "autocare_chat_blocks" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "threadId" uuid NOT NULL,
            "blockerId" uuid NOT NULL,
            "blockedUserId" uuid NOT NULL,
            "status" "autocare_chat_block_status" NOT NULL DEFAULT 'active',
            "reason" text,
            "revokedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_chat_blocks_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_chat_blocks_thread" FOREIGN KEY ("threadId") REFERENCES "autocare_chat_threads"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_chat_blocks_blocker" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE RESTRICT,
            CONSTRAINT "FK_autocare_chat_blocks_blocked_user" FOREIGN KEY ("blockedUserId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "CHK_autocare_chat_blocks_distinct_users" CHECK ("blockerId" <> "blockedUserId")
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_blocks_thread_status" ON "autocare_chat_blocks" ("threadId", "status")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_blocks_blocked_status" ON "autocare_chat_blocks" ("blockedUserId", "status")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_chat_blocks_scope" ON "autocare_chat_blocks" ("threadId", "blockerId", "blockedUserId")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_chat_blocks_scope"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_blocks_blocked_status"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_blocks_thread_status"`)
        await queryRunner.query(`DROP TABLE "autocare_chat_blocks"`)
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_chat_reports_reporter_thread"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_reports_thread_created"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_reports_status_created"`)
        await queryRunner.query(`DROP TABLE "autocare_chat_reports"`)
        await queryRunner.query(`DROP TYPE "autocare_chat_block_status"`)
        await queryRunner.query(`DROP TYPE "autocare_chat_report_status"`)
        await queryRunner.query(`DROP TYPE "autocare_chat_report_category"`)
    }
}
