import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareProviderLogo1785800000000 implements MigrationInterface {
    name = 'AddAutoCareProviderLogo1785800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "logoUrl" text`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "logoUrl"`)
    }
}
