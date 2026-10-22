import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Preserve historical duplicate submissions while giving each request one
 * canonical case key. New submissions always carry that key and are unique. */
export class UniqueGuaranteeClaimCase1786430000000 implements MigrationInterface {
    name = 'UniqueGuaranteeClaimCase1786430000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_guarantee_claims" ADD "caseKey" uuid`)
        await queryRunner.query(`WITH ranked AS (
            SELECT "id", "requestId", ROW_NUMBER() OVER (PARTITION BY "requestId" ORDER BY "createdAt", "id") AS ordinal
            FROM "autocare_guarantee_claims"
        )
        UPDATE "autocare_guarantee_claims" AS claim
        SET "caseKey" = ranked."requestId"
        FROM ranked WHERE claim."id" = ranked."id" AND ranked.ordinal = 1`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_guarantee_claim_case" ON "autocare_guarantee_claims" ("caseKey") WHERE "caseKey" IS NOT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_autocare_guarantee_claim_case"`)
        await queryRunner.query(`ALTER TABLE "autocare_guarantee_claims" DROP COLUMN "caseKey"`)
    }
}
