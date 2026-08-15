import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareRescheduleRequests1785990000000 implements MigrationInterface {
    name = 'CreateAutoCareRescheduleRequests1785990000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "autocare_reschedule_status" AS ENUM ('pending', 'accepted', 'rejected')`)
        await queryRunner.query(`CREATE TABLE "autocare_reschedule_requests" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "requestId" uuid NOT NULL,
            "requestedById" uuid NOT NULL,
            "proposedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "status" "autocare_reschedule_status" NOT NULL DEFAULT 'pending',
            "reason" text,
            "resolvedById" uuid,
            "resolutionReason" text,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "resolvedAt" TIMESTAMP WITH TIME ZONE,
            CONSTRAINT "PK_autocare_reschedule_requests_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_reschedule_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_reschedule_requested_by" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT,
            CONSTRAINT "FK_autocare_reschedule_resolved_by" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL,
            CONSTRAINT "CHK_autocare_reschedule_reason" CHECK ("reason" IS NULL OR char_length("reason") <= 1000),
            CONSTRAINT "CHK_autocare_reschedule_resolution_reason" CHECK ("resolutionReason" IS NULL OR char_length("resolutionReason") <= 1000)
        )`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_reschedule_pending" ON "autocare_reschedule_requests" ("requestId") WHERE "status" = 'pending'`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_reschedule_request_history" ON "autocare_reschedule_requests" ("requestId", "createdAt")`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_autocare_reschedule_request_history"`)
        await queryRunner.query(`DROP INDEX "UQ_autocare_reschedule_pending"`)
        await queryRunner.query(`DROP TABLE "autocare_reschedule_requests"`)
        await queryRunner.query(`DROP TYPE "autocare_reschedule_status"`)
    }
}
