import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareCatalogGapRequests1786100000000 implements MigrationInterface {
    name = 'CreateAutoCareCatalogGapRequests1786100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "autocare_catalog_gap_request_status" AS ENUM ('pending', 'approved', 'rejected')`)
        await queryRunner.query(`CREATE TABLE "autocare_catalog_gap_requests" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "requestedById" uuid NOT NULL,
            "providerId" uuid,
            "proposedSlug" text NOT NULL,
            "categorySlug" text NOT NULL,
            "labels" jsonb NOT NULL DEFAULT '{}',
            "priceType" text NOT NULL,
            "comparisonAttributes" jsonb NOT NULL DEFAULT '[]',
            "rationale" text NOT NULL,
            "status" "autocare_catalog_gap_request_status" NOT NULL DEFAULT 'pending',
            "reviewedById" uuid,
            "reviewReason" text,
            "reviewedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_catalog_gap_requests_id" PRIMARY KEY ("id"),
            CONSTRAINT "CHK_autocare_catalog_gap_requests_slug" CHECK ("proposedSlug" ~ '^[a-z0-9][a-z0-9_-]{1,119}$'),
            CONSTRAINT "CHK_autocare_catalog_gap_requests_rationale" CHECK (char_length("rationale") BETWEEN 10 AND 2000),
            CONSTRAINT "CHK_autocare_catalog_gap_requests_reason" CHECK ("reviewReason" IS NULL OR char_length("reviewReason") BETWEEN 1 AND 2000),
            CONSTRAINT "FK_autocare_catalog_gap_requests_requested_by" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT,
            CONSTRAINT "FK_autocare_catalog_gap_requests_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE SET NULL,
            CONSTRAINT "FK_autocare_catalog_gap_requests_reviewed_by" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_catalog_gap_requests_status_created" ON "autocare_catalog_gap_requests" ("status", "createdAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_catalog_gap_requests_slug_status" ON "autocare_catalog_gap_requests" ("proposedSlug", "status")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_catalog_gap_requests_pending_slug" ON "autocare_catalog_gap_requests" ("proposedSlug") WHERE "status" = 'pending'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_catalog_gap_requests_pending_slug"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_catalog_gap_requests_slug_status"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_catalog_gap_requests_status_created"`)
        await queryRunner.query(`DROP TABLE "autocare_catalog_gap_requests"`)
        await queryRunner.query(`DROP TYPE "autocare_catalog_gap_request_status"`)
    }
}
