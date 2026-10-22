import type { MigrationInterface, QueryRunner } from 'typeorm'

export class FairTrustReassessmentQueue1786450000000 implements MigrationInterface {
    name = 'FairTrustReassessmentQueue1786450000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "trustReassessmentAttemptedAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_provider_trust_due" ON "autocare_providers" ("trustReassessmentAttemptedAt" ASC NULLS FIRST, "createdAt" ASC, "id" ASC) WHERE "status" = 'active'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_autocare_provider_trust_due"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "trustReassessmentAttemptedAt"`)
    }
}
