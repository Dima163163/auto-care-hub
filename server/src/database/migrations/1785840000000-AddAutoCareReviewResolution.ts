import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareReviewResolution1785840000000 implements MigrationInterface {
    name = 'AddAutoCareReviewResolution1785840000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "clientId" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "serviceRequestId" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "serviceSlug" text`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "revisionAllowedUntil" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "revisionUsedAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`)
        await queryRunner.query(`CREATE TYPE "public"."autocare_review_promo_status" AS ENUM('active', 'redeemed', 'revoked', 'expired')`)
        await queryRunner.query(`CREATE TABLE "autocare_review_promos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "reviewId" uuid NOT NULL, "clientId" uuid, "serviceRequestId" uuid, "serviceSlug" text, "code" text NOT NULL, "discountPercent" integer NOT NULL, "status" "public"."autocare_review_promo_status" NOT NULL DEFAULT 'active', "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "redeemedAt" TIMESTAMP WITH TIME ZONE, "redeemedById" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_review_promos_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_autocare_review_promos_code" UNIQUE ("code"), CONSTRAINT "CHK_autocare_review_promos_discount" CHECK ("discountPercent" BETWEEN 1 AND 100))`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_review_promos_provider_created" ON "autocare_review_promos" ("providerId", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_review_promos_provider_created"`)
        await queryRunner.query(`DROP TABLE "autocare_review_promos"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_review_promo_status"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "updatedAt"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "revisionUsedAt"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "revisionAllowedUntil"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "serviceSlug"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "serviceRequestId"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "clientId"`)
    }
}
