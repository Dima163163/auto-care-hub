import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ClientCommunityProfilesAndHelpfulVotes1786400000000 implements MigrationInterface {
    name = 'ClientCommunityProfilesAndHelpfulVotes1786400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "user_consent_type" ADD VALUE IF NOT EXISTS 'community_profile'`)
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "communityProfileId" uuid NOT NULL DEFAULT gen_random_uuid()`)
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "communityProfileEnabled" boolean NOT NULL DEFAULT false`)
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "communityDisplayName" text`)
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "CHK_users_community_display_name" CHECK ("communityDisplayName" IS NULL OR (char_length(btrim("communityDisplayName")) BETWEEN 2 AND 40 AND "communityDisplayName" !~ '[[:cntrl:]]'))`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_community_profile_id" ON "users" ("communityProfileId")`)

        await queryRunner.query(`CREATE TABLE "autocare_review_helpful_votes" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "reviewId" uuid NOT NULL,
            "voterUserId" uuid NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_review_helpful_votes" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_review_helpful_votes_review" FOREIGN KEY ("reviewId") REFERENCES "autocare_reviews"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_review_helpful_votes_voter" FOREIGN KEY ("voterUserId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "UQ_autocare_review_helpful_votes_review_voter" UNIQUE ("reviewId", "voterUserId")
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_review_helpful_votes_voter_created" ON "autocare_review_helpful_votes" ("voterUserId", "createdAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_review_helpful_votes_review_created" ON "autocare_review_helpful_votes" ("reviewId", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_autocare_review_helpful_votes_review_created"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_autocare_review_helpful_votes_voter_created"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "autocare_review_helpful_votes"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_community_profile_id"`)
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_community_display_name"`)
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "communityDisplayName"`)
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "communityProfileEnabled"`)
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "communityProfileId"`)
        // PostgreSQL does not support removing a value from an enum safely.
    }
}
