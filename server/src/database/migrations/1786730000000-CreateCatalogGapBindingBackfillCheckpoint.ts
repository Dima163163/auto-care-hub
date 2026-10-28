import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCatalogGapBindingBackfillCheckpoint1786730000000 implements MigrationInterface {
    name = 'CreateCatalogGapBindingBackfillCheckpoint1786730000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_catalog_gap_requests" ADD "labelsBinding" text, ADD "comparisonAttributesBinding" text, ADD "rationaleBinding" text, ADD "reviewReasonBinding" text')
        await queryRunner.query(`CREATE TABLE "catalog_gap_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "catalog_gap_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_catalog_gap_requests" DROP COLUMN "labelsBinding", DROP COLUMN "comparisonAttributesBinding", DROP COLUMN "rationaleBinding", DROP COLUMN "reviewReasonBinding"')
    }
}
