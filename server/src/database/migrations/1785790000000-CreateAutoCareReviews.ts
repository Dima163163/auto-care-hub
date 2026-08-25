import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareReviews1785790000000 implements MigrationInterface {
    name = 'CreateAutoCareReviews1785790000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."autocare_review_status" AS ENUM('approved', 'pending', 'rejected')`)
        await queryRunner.query(`CREATE TABLE "autocare_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "authorName" text NOT NULL, "vehicleLabel" text NOT NULL, "rating" integer NOT NULL, "text" text NOT NULL, "avatarUrl" text, "status" "public"."autocare_review_status" NOT NULL DEFAULT 'approved', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_reviews_id" PRIMARY KEY ("id"), CONSTRAINT "FK_autocare_reviews_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE, CONSTRAINT "CHK_autocare_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5), CONSTRAINT "CHK_autocare_reviews_text" CHECK (char_length("text") BETWEEN 10 AND 1000))`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_reviews_provider_status_created" ON "autocare_reviews" ("providerId", "status", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_reviews_provider_status_created"`)
        await queryRunner.query(`DROP TABLE "autocare_reviews"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_review_status"`)
    }
}
