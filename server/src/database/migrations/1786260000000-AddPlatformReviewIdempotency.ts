import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPlatformReviewIdempotency1786260000000 implements MigrationInterface {
    name = 'AddPlatformReviewIdempotency1786260000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform_reviews" ADD "idempotencyKey" character varying(128)`)
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_platform_reviews_client_idempotency_key" ON "platform_reviews" ("clientId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_platform_reviews_client_idempotency_key"`)
        await queryRunner.query(`ALTER TABLE "platform_reviews" DROP COLUMN "idempotencyKey"`)
    }
}
