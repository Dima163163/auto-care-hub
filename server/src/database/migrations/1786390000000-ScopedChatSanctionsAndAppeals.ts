import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ScopedChatSanctionsAndAppeals1786390000000 implements MigrationInterface {
    name = 'ScopedChatSanctionsAndAppeals1786390000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "autocare_appeal_subject" ADD VALUE IF NOT EXISTS 'chat_restriction'`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_reports" ADD COLUMN "overturnedAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_blocks" ADD COLUMN "sourceReportId" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_blocks" ADD COLUMN "expiresAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_blocks" ADD CONSTRAINT "FK_autocare_chat_blocks_source_report" FOREIGN KEY ("sourceReportId") REFERENCES "autocare_chat_reports"("id") ON DELETE SET NULL`)
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_autocare_chat_blocks_scope"`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_chat_blocks_user_scope" ON "autocare_chat_blocks" ("threadId", "blockerId", "blockedUserId") WHERE "sourceReportId" IS NULL AND "status" = 'active'`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_chat_blocks_report" ON "autocare_chat_blocks" ("sourceReportId") WHERE "sourceReportId" IS NOT NULL`)
        await queryRunner.query(`WITH eligible_reports AS (
            SELECT DISTINCT ON ("threadId", "reportedUserId", "reviewedById") "id", "threadId", "reportedUserId", "reviewedById"
            FROM "autocare_chat_reports"
            WHERE "status" = 'resolved' AND "reportedUserId" IS NOT NULL AND "reviewedById" IS NOT NULL
            ORDER BY "threadId", "reportedUserId", "reviewedById", "reviewedAt" DESC NULLS LAST, "createdAt" DESC
        )
        UPDATE "autocare_chat_blocks" block
        SET "sourceReportId" = report."id", "expiresAt" = block."createdAt" + INTERVAL '24 hours'
        FROM eligible_reports report
        WHERE block."threadId" = report."threadId"
            AND block."blockedUserId" = report."reportedUserId"
            AND block."blockerId" = report."reviewedById"
            AND block."sourceReportId" IS NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_autocare_chat_blocks_report"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_autocare_chat_blocks_user_scope"`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_chat_blocks_scope" ON "autocare_chat_blocks" ("threadId", "blockerId", "blockedUserId")`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_blocks" DROP CONSTRAINT "FK_autocare_chat_blocks_source_report"`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_blocks" DROP COLUMN "expiresAt"`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_blocks" DROP COLUMN "sourceReportId"`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_reports" DROP COLUMN "overturnedAt"`)
    }
}
