import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareProviderProfileDetails1785890000000 implements MigrationInterface {
    name = 'AddAutoCareProviderProfileDetails1785890000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "phone" text`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "email" text`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "websiteUrl" text`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "metroStation" text`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "workstationCount" integer NOT NULL DEFAULT 0`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "warrantyText" text`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "warrantyText"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "workstationCount"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "metroStation"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "websiteUrl"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "email"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "phone"`)
    }
}
