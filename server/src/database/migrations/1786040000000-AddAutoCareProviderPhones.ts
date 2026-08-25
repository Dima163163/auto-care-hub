import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareProviderPhones1786040000000 implements MigrationInterface {
    name = 'AddAutoCareProviderPhones1786040000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "phones" text[] NOT NULL DEFAULT '{}'`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD CONSTRAINT "CHK_autocare_provider_phones_count" CHECK (cardinality("phones") <= 5) NOT VALID`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP CONSTRAINT "CHK_autocare_provider_phones_count"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "phones"`)
    }
}
