import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSecurityNotificationCategory1784183300000 implements MigrationInterface {
    name = 'AddSecurityNotificationCategory1784183300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."notification_category" ADD VALUE IF NOT EXISTS 'security'`,
        )
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not safely remove enum values in a reversible migration.
    }
}
