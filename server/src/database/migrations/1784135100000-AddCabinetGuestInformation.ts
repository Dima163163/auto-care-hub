import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCabinetGuestInformation1784135100000 implements MigrationInterface {
    name = 'AddCabinetGuestInformation1784135100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"cabinets\" ADD \"amenities\" text array NOT NULL DEFAULT '{}'::text[]")
        await queryRunner.query('ALTER TABLE "cabinets" ADD "cancellationPolicy" text')
        await queryRunner.query('ALTER TABLE "cabinets" ADD "houseRules" text')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "cabinets" DROP COLUMN "houseRules"')
        await queryRunner.query('ALTER TABLE "cabinets" DROP COLUMN "cancellationPolicy"')
        await queryRunner.query('ALTER TABLE "cabinets" DROP COLUMN "amenities"')
    }
}
