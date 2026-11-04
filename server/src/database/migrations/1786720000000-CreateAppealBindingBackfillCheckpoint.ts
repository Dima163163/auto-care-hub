import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAppealBindingBackfillCheckpoint1786720000000 implements MigrationInterface {
    name = 'CreateAppealBindingBackfillCheckpoint1786720000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_appeals" ADD "reasonBinding" text, ADD "decisionReasonBinding" text')
        await queryRunner.query(`CREATE TABLE "appeal_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "appeal_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_appeals" DROP COLUMN "reasonBinding", DROP COLUMN "decisionReasonBinding"')
    }
}
