import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateEmailBindingBackfillCheckpoints1786470000000 implements MigrationInterface {
    name = 'CreateEmailBindingBackfillCheckpoints1786470000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "email_binding_backfill_checkpoints"`)
    }
}
