import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * One unresolved appeal per submitter and subject prevents duplicate moderation
 * work when clients retry or two browser tabs submit at the same time.
 * Existing duplicate rows must be reviewed before this migration is applied.
 */
export class AddAutoCareAppealPendingUniqueIndex1786310000000 implements MigrationInterface {
    name = 'AddAutoCareAppealPendingUniqueIndex1786310000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_appeals_pending_subject" ON "autocare_appeals" ("submittedById", "subject", "subjectId") WHERE "status" = 'pending'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_autocare_appeals_pending_subject"`)
    }
}
