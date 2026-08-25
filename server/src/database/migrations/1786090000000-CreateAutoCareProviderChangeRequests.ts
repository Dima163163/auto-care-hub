import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareProviderChangeRequests1786090000000 implements MigrationInterface {
    name = 'CreateAutoCareProviderChangeRequests1786090000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "autocare_provider_change_request_kind" AS ENUM ('verification', 'profile_update')`)
        await queryRunner.query(`CREATE TYPE "autocare_provider_change_request_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled')`)
        await queryRunner.query(`CREATE TABLE "autocare_provider_change_requests" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providerId" uuid NOT NULL,
            "requestedById" uuid NOT NULL,
            "kind" "autocare_provider_change_request_kind" NOT NULL,
            "status" "autocare_provider_change_request_status" NOT NULL DEFAULT 'pending',
            "payload" jsonb NOT NULL DEFAULT '{}',
            "reviewedById" uuid,
            "reviewReason" text,
            "reviewedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_provider_change_requests_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_provider_change_requests_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_provider_change_requests_requested_by" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT,
            CONSTRAINT "FK_autocare_provider_change_requests_reviewed_by" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL,
            CONSTRAINT "CHK_autocare_provider_change_requests_reason" CHECK ("reviewReason" IS NULL OR char_length("reviewReason") BETWEEN 1 AND 2000)
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_provider_change_requests_provider_status" ON "autocare_provider_change_requests" ("providerId", "status", "createdAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_provider_change_requests_kind_status" ON "autocare_provider_change_requests" ("kind", "status", "createdAt")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_provider_change_requests_pending_kind" ON "autocare_provider_change_requests" ("providerId", "kind") WHERE "status" = 'pending'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_provider_change_requests_pending_kind"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_provider_change_requests_kind_status"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_provider_change_requests_provider_status"`)
        await queryRunner.query(`DROP TABLE "autocare_provider_change_requests"`)
        await queryRunner.query(`DROP TYPE "autocare_provider_change_request_status"`)
        await queryRunner.query(`DROP TYPE "autocare_provider_change_request_kind"`)
    }
}
