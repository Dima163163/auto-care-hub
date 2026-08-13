import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareProviderBrandSpecializations1785720000000 implements MigrationInterface {
    name = 'AddAutoCareProviderBrandSpecializations1785720000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "brandSpecializations" text array NOT NULL DEFAULT '{}'`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "isMultibrand" boolean NOT NULL DEFAULT false`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "isMultibrand"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "brandSpecializations"`)
    }
}
