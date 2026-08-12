import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCabinetTimezone1784000200000 implements MigrationInterface {
    name = 'AddCabinetTimezone1784000200000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cabinets" ADD "timezone" text NOT NULL DEFAULT 'UTC'`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cabinets" DROP COLUMN "timezone"`)
    }
}
