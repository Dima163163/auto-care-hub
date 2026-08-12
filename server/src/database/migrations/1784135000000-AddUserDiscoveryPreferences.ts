import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserDiscoveryPreferences1784135000000 implements MigrationInterface {
    name = 'AddUserDiscoveryPreferences1784135000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users" ADD "preferredCity" text')
        await queryRunner.query("ALTER TABLE \"users\" ADD \"preferredCategories\" text array NOT NULL DEFAULT '{}'::text[]")
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "preferredCategories"')
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "preferredCity"')
    }
}
