import type { MigrationInterface, QueryRunner } from "typeorm"

export class AddEmailNotificationsToUsers1781500869214 implements MigrationInterface {
    name = 'AddEmailNotificationsToUsers1781500869214'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "emailNotifications" boolean NOT NULL DEFAULT true`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailNotifications"`)
    }

}
