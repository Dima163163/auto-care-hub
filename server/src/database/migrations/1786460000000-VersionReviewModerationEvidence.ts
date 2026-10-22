import type { MigrationInterface, QueryRunner } from 'typeorm'

export class VersionReviewModerationEvidence1786460000000 implements MigrationInterface {
    name = 'VersionReviewModerationEvidence1786460000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "contentRevision" integer NOT NULL DEFAULT 1`)
        await queryRunner.query(`ALTER TABLE "autocare_trust_evidence" ADD "reviewRevision" integer`)
        await queryRunner.query(`UPDATE "autocare_trust_evidence" SET "reviewRevision" = 1 WHERE "kind" = 'review'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_trust_evidence" DROP COLUMN "reviewRevision"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "contentRevision"`)
    }
}
