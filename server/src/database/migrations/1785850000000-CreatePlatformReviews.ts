import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePlatformReviews1785850000000 implements MigrationInterface {
    name = 'CreatePlatformReviews1785850000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."platform_review_status" AS ENUM('pending', 'approved', 'rejected', 'removed')`)
        await queryRunner.query(`CREATE TABLE "platform_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientId" uuid, "authorName" text NOT NULL, "avatarUrl" text, "authorRole" text NOT NULL DEFAULT 'AutoCare Hub клиент', "rating" integer NOT NULL, "text" text NOT NULL, "status" "public"."platform_review_status" NOT NULL DEFAULT 'pending', "organizationResponse" text, "respondedById" uuid, "organizationRespondedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_platform_reviews_id" PRIMARY KEY ("id"), CONSTRAINT "CHK_platform_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5), CONSTRAINT "CHK_platform_reviews_text" CHECK (char_length("text") BETWEEN 10 AND 1000))`)
        await queryRunner.query(`CREATE INDEX "IDX_platform_reviews_status_created" ON "platform_reviews" ("status", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_platform_reviews_status_created"`)
        await queryRunner.query(`DROP TABLE "platform_reviews"`)
        await queryRunner.query(`DROP TYPE "public"."platform_review_status"`)
    }
}
