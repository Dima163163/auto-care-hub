import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUserProfileBindingBackfillCheckpoint1786500000000 implements MigrationInterface {
    name = 'CreateUserProfileBindingBackfillCheckpoint1786500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users" ADD "nameBinding" text')
        await queryRunner.query('ALTER TABLE "users" ADD "phoneBinding" text')
        await queryRunner.query(`CREATE TABLE "user_profile_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "user_profile_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "phoneBinding"')
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "nameBinding"')
    }
}
