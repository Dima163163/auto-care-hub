import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateOAuthBindingBackfillCheckpoint1786490000000 implements MigrationInterface {
    name = 'CreateOAuthBindingBackfillCheckpoint1786490000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oauth_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "oauth_binding_backfill_checkpoints"')
    }
}
