import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareAppeals1786130000000 implements MigrationInterface {
    name = 'CreateAutoCareAppeals1786130000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "autocare_appeal_subject" AS ENUM ('provider', 'review', 'suspension', 'catalog')`)
        await queryRunner.query(`CREATE TYPE "autocare_appeal_status" AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn')`)
        await queryRunner.query(`CREATE TABLE "autocare_appeals" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "subject" "autocare_appeal_subject" NOT NULL,
            "subjectId" uuid NOT NULL,
            "submittedById" uuid NOT NULL,
            "providerId" uuid,
            "reason" text NOT NULL,
            "evidenceIds" text[] NOT NULL DEFAULT '{}',
            "status" "autocare_appeal_status" NOT NULL DEFAULT 'pending',
            "decidedById" uuid,
            "decisionReason" text,
            "decidedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_appeals_id" PRIMARY KEY ("id"),
            CONSTRAINT "CHK_autocare_appeals_reason" CHECK (char_length("reason") BETWEEN 20 AND 4000),
            CONSTRAINT "CHK_autocare_appeals_decision_reason" CHECK ("decisionReason" IS NULL OR char_length("decisionReason") BETWEEN 1 AND 2000),
            CONSTRAINT "FK_autocare_appeals_submitter" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT,
            CONSTRAINT "FK_autocare_appeals_decider" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL,
            CONSTRAINT "FK_autocare_appeals_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE SET NULL
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_appeals_status_created" ON "autocare_appeals" ("status", "createdAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_appeals_submitter_created" ON "autocare_appeals" ("submittedById", "createdAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_appeals_subject_status" ON "autocare_appeals" ("subject", "subjectId", "status")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_appeals_subject_status"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_appeals_submitter_created"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_appeals_status_created"`)
        await queryRunner.query(`DROP TABLE "autocare_appeals"`)
        await queryRunner.query(`DROP TYPE "autocare_appeal_status"`)
        await queryRunner.query(`DROP TYPE "autocare_appeal_subject"`)
    }
}
