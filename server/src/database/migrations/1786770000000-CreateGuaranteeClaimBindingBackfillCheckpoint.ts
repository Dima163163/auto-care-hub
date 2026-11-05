import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateGuaranteeClaimBindingBackfillCheckpoint1786770000000 implements MigrationInterface {
    name = 'CreateGuaranteeClaimBindingBackfillCheckpoint1786770000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_guarantee_claims" ADD "summaryBinding" text, ADD "resolutionBinding" text')
        await queryRunner.query(`CREATE TABLE "guarantee_claim_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "guarantee_claim_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_guarantee_claims" DROP COLUMN "summaryBinding", DROP COLUMN "resolutionBinding"')
    }
}
