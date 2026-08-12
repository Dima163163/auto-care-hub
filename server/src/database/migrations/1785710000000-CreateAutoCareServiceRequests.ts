import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareServiceRequests1785710000000 implements MigrationInterface {
    name = 'CreateAutoCareServiceRequests1785710000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."autocare_service_request_status" AS ENUM('draft', 'open', 'awaiting_reply', 'estimate_shared', 'accepted', 'declined', 'closed')`)
        await queryRunner.query(`CREATE TYPE "public"."autocare_service_message_kind" AS ENUM('text', 'system')`)
        await queryRunner.query(`CREATE TYPE "public"."autocare_service_attachment_status" AS ENUM('pending', 'ready', 'rejected')`)
        await queryRunner.query(`CREATE TABLE "autocare_service_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientId" uuid NOT NULL, "providerId" uuid NOT NULL, "locationId" uuid NOT NULL, "definitionId" uuid NOT NULL, "offeringId" uuid, "vehicleSnapshot" jsonb, "preferredAt" TIMESTAMP WITH TIME ZONE, "note" text, "status" "public"."autocare_service_request_status" NOT NULL DEFAULT 'draft', "clientConfirmedAt" TIMESTAMP WITH TIME ZONE, "providerConfirmedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_service_requests_id" PRIMARY KEY ("id"), CONSTRAINT "CHK_autocare_service_requests_note" CHECK ("note" IS NULL OR char_length("note") <= 4000), CONSTRAINT "FK_autocare_requests_client" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT, CONSTRAINT "FK_autocare_requests_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE RESTRICT, CONSTRAINT "FK_autocare_requests_location" FOREIGN KEY ("locationId") REFERENCES "autocare_service_locations"("id") ON DELETE RESTRICT, CONSTRAINT "FK_autocare_requests_definition" FOREIGN KEY ("definitionId") REFERENCES "autocare_service_definitions"("id") ON DELETE RESTRICT, CONSTRAINT "FK_autocare_requests_offering" FOREIGN KEY ("offeringId") REFERENCES "autocare_service_offerings"("id") ON DELETE RESTRICT)`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_requests_client_created" ON "autocare_service_requests" ("clientId", "createdAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_requests_provider_status_created" ON "autocare_service_requests" ("providerId", "status", "createdAt")`)
        await queryRunner.query(`CREATE TABLE "autocare_service_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requestId" uuid NOT NULL, "senderId" uuid NOT NULL, "kind" "public"."autocare_service_message_kind" NOT NULL DEFAULT 'text', "body" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_service_messages_id" PRIMARY KEY ("id"), CONSTRAINT "CHK_autocare_service_messages_body" CHECK ("body" IS NULL OR char_length("body") BETWEEN 1 AND 4000), CONSTRAINT "FK_autocare_messages_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE CASCADE, CONSTRAINT "FK_autocare_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT)`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_messages_request_created" ON "autocare_service_messages" ("requestId", "createdAt")`)
        await queryRunner.query(`CREATE TABLE "autocare_service_attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requestId" uuid NOT NULL, "uploadedById" uuid NOT NULL, "objectKey" text NOT NULL, "contentType" text NOT NULL, "bytes" integer NOT NULL, "checksum" text, "status" "public"."autocare_service_attachment_status" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_service_attachments_id" PRIMARY KEY ("id"), CONSTRAINT "CHK_autocare_service_attachments_bytes" CHECK ("bytes" BETWEEN 1 AND 10485760), CONSTRAINT "FK_autocare_attachments_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE CASCADE, CONSTRAINT "FK_autocare_attachments_uploader" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT)`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_attachments_request_created" ON "autocare_service_attachments" ("requestId", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_attachments_request_created"`)
        await queryRunner.query(`DROP TABLE "autocare_service_attachments"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_messages_request_created"`)
        await queryRunner.query(`DROP TABLE "autocare_service_messages"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_requests_provider_status_created"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_requests_client_created"`)
        await queryRunner.query(`DROP TABLE "autocare_service_requests"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_service_attachment_status"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_service_message_kind"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_service_request_status"`)
    }
}
