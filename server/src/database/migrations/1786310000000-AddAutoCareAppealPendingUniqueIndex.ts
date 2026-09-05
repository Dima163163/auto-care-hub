import type { MigrationInterface, QueryRunner } from 'typeorm'

type DuplicateAppealRow = { count?: string | number }

/**
 * One unresolved appeal per submitter and subject prevents duplicate moderation
 * work when clients retry or two browser tabs submit at the same time.
 * Existing duplicate rows must be reviewed before this migration is applied.
 */
export class AddAutoCareAppealPendingUniqueIndex1786310000000 implements MigrationInterface {
    name = 'AddAutoCareAppealPendingUniqueIndex1786310000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const duplicateRows = await queryRunner.query(`
            SELECT COUNT(*)::int AS "count"
            FROM "autocare_appeals"
            WHERE "status" = 'pending'
            GROUP BY "submittedById", "subject", "subjectId"
            HAVING COUNT(*) > 1
        `) as DuplicateAppealRow[]

        if (!Array.isArray(duplicateRows)) {
            throw new Error('AutoCare appeal duplicate preflight returned an invalid result.')
        }

        for (const row of duplicateRows) {
            const duplicateCount = Number(row.count)
            if (!Number.isSafeInteger(duplicateCount) || duplicateCount < 2) {
                throw new Error('AutoCare appeal duplicate preflight returned an invalid count.')
            }
        }

        if (duplicateRows.length > 0) {
            throw new Error(
                `Cannot add pending appeal uniqueness: ${duplicateRows.length} duplicate key group(s) require reconciliation.`,
            )
        }

        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_appeals_pending_subject" ON "autocare_appeals" ("submittedById", "subject", "subjectId") WHERE "status" = 'pending'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_autocare_appeals_pending_subject"`)
    }
}
