import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareRequestFollowup1785770000000 implements MigrationInterface {
    name = 'AddAutoCareRequestFollowup1785770000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "estimateSnapshot" jsonb`)
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" ADD "content" bytea`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_attachments" DROP COLUMN "content"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "estimateSnapshot"`)
    }
}
