import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareProviderAmenities1785740000000 implements MigrationInterface {
    name = 'AddAutoCareProviderAmenities1785740000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "amenityIds" text array NOT NULL DEFAULT '{}'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "amenityIds"`)
    }
}
