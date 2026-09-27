import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ScopedAutoCareChatModeration1786360000000 implements MigrationInterface {
    name = 'ScopedAutoCareChatModeration1786360000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "autocare_chat_report_category" ADD VALUE IF NOT EXISTS 'threat'`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_reports"
            ADD COLUMN "reportedMessageId" uuid,
            ADD COLUMN "relatedReportId" uuid,
            ADD COLUMN "acknowledgedAt" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN "policyVersion" character varying(32),
            ADD COLUMN "assignedModeratorId" uuid,
            ADD COLUMN "assignedById" uuid,
            ADD COLUMN "assignmentReason" text,
            ADD COLUMN "assignedAt" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN "accessExpiresAt" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN "extensionUsed" boolean NOT NULL DEFAULT false,
            ADD COLUMN "extensionReason" text,
            ADD COLUMN "extendedAt" TIMESTAMP WITH TIME ZONE,
            ADD CONSTRAINT "CHK_autocare_chat_reports_assignment_reason" CHECK ("assignmentReason" IS NULL OR char_length("assignmentReason") BETWEEN 1 AND 2000),
            ADD CONSTRAINT "CHK_autocare_chat_reports_extension_reason" CHECK ("extensionReason" IS NULL OR char_length("extensionReason") BETWEEN 1 AND 2000),
            ADD CONSTRAINT "FK_autocare_chat_reports_message" FOREIGN KEY ("reportedMessageId") REFERENCES "autocare_service_messages"("id") ON DELETE SET NULL,
            ADD CONSTRAINT "FK_autocare_chat_reports_related" FOREIGN KEY ("relatedReportId") REFERENCES "autocare_chat_reports"("id") ON DELETE SET NULL,
            ADD CONSTRAINT "FK_autocare_chat_reports_moderator" FOREIGN KEY ("assignedModeratorId") REFERENCES "users"("id") ON DELETE SET NULL,
            ADD CONSTRAINT "FK_autocare_chat_reports_assigner" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages"
            ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN "deletedById" uuid,
            ADD CONSTRAINT "FK_autocare_service_messages_deleted_by" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL`)

        // Historical reports did not record consent or an exact message anchor.
        // Keep them visible in queue metadata, but fail closed for content access.
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_chat_reports_reporter_thread"`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_chat_reports_thread_reporter_message" ON "autocare_chat_reports" ("threadId", "reporterId", "reportedMessageId") WHERE "reportedMessageId" IS NOT NULL`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_reports_assigned_status_expiry" ON "autocare_chat_reports" ("assignedModeratorId", "status", "accessExpiresAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_reports_message" ON "autocare_chat_reports" ("reportedMessageId") WHERE "reportedMessageId" IS NOT NULL`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_chat_reports_related" ON "autocare_chat_reports" ("relatedReportId") WHERE "relatedReportId" IS NOT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_reports_related"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_reports_message"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_chat_reports_assigned_status_expiry"`)
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_chat_reports_thread_reporter_message"`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_chat_reports_reporter_thread" ON "autocare_chat_reports" ("threadId", "reporterId")`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP CONSTRAINT "FK_autocare_service_messages_deleted_by", DROP COLUMN "deletedById", DROP COLUMN "deletedAt"`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_reports"
            DROP CONSTRAINT "FK_autocare_chat_reports_assigner",
            DROP CONSTRAINT "FK_autocare_chat_reports_moderator",
            DROP CONSTRAINT "FK_autocare_chat_reports_related",
            DROP CONSTRAINT "FK_autocare_chat_reports_message",
            DROP CONSTRAINT "CHK_autocare_chat_reports_extension_reason",
            DROP CONSTRAINT "CHK_autocare_chat_reports_assignment_reason",
            DROP COLUMN "extendedAt",
            DROP COLUMN "extensionReason",
            DROP COLUMN "extensionUsed",
            DROP COLUMN "accessExpiresAt",
            DROP COLUMN "assignedAt",
            DROP COLUMN "assignmentReason",
            DROP COLUMN "assignedById",
            DROP COLUMN "assignedModeratorId",
            DROP COLUMN "policyVersion",
            DROP COLUMN "acknowledgedAt",
            DROP COLUMN "relatedReportId",
            DROP COLUMN "reportedMessageId"`)
    }
}
