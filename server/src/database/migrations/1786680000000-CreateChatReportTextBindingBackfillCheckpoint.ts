import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateChatReportTextBindingBackfillCheckpoint1786680000000 implements MigrationInterface {
    name = 'CreateChatReportTextBindingBackfillCheckpoint1786680000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_chat_reports" ADD "descriptionBinding" text, ADD "resolutionReasonBinding" text, ADD "assignmentReasonBinding" text, ADD "extensionReasonBinding" text')
        await queryRunner.query(`CREATE TABLE "chat_report_text_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "chat_report_text_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_chat_reports" DROP COLUMN "descriptionBinding", DROP COLUMN "resolutionReasonBinding", DROP COLUMN "assignmentReasonBinding", DROP COLUMN "extensionReasonBinding"')
    }
}
