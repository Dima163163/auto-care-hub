import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUserSecondaryBindingBackfillCheckpoint1786610000000 implements MigrationInterface {
    name = 'CreateUserSecondaryBindingBackfillCheckpoint1786610000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users" ADD "avatarUrlBinding" text, ADD "communityDisplayNameBinding" text, ADD "preferredCityBinding" text')
        await queryRunner.query(`CREATE TABLE "user_secondary_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "user_secondary_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "avatarUrlBinding", DROP COLUMN "communityDisplayNameBinding", DROP COLUMN "preferredCityBinding"')
    }
}
