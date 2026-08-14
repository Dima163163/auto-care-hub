import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareReviewPhotos1785820000000 implements MigrationInterface {
    name = 'AddAutoCareReviewPhotos1785820000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "photoUrls" text array NOT NULL DEFAULT '{}'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "photoUrls"`)
    }
}
