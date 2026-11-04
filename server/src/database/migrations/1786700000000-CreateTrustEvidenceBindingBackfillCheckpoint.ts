import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTrustEvidenceBindingBackfillCheckpoint1786700000000 implements MigrationInterface {
    name = 'CreateTrustEvidenceBindingBackfillCheckpoint1786700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_trust_evidence" ADD "referenceBinding" text, ADD "notesBinding" text')
        await queryRunner.query(`CREATE TABLE "trust_evidence_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "trust_evidence_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_trust_evidence" DROP COLUMN "referenceBinding", DROP COLUMN "notesBinding"')
    }
}
