import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUserConsentRecords1786330000000 implements MigrationInterface {
    name = 'CreateUserConsentRecords1786330000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "user_consent_type" AS ENUM ('terms', 'privacy', 'analytics', 'marketing', 'service_request')`)
        await queryRunner.query(`CREATE TYPE "user_consent_action" AS ENUM ('granted', 'revoked')`)
        await queryRunner.query(`CREATE TYPE "user_consent_source" AS ENUM ('registration', 'oauth_registration', 'service_request', 'profile', 'migration')`)
        await queryRunner.query(`CREATE TABLE "user_consent_records" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "user_id" uuid NOT NULL,
            "consent_type" "user_consent_type" NOT NULL,
            "action" "user_consent_action" NOT NULL,
            "document_version" text NOT NULL,
            "source" "user_consent_source" NOT NULL,
            "resource_id" uuid,
            "ip_address_hash" char(64),
            "user_agent_hash" char(64),
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_user_consent_records" PRIMARY KEY ("id"),
            CONSTRAINT "FK_user_consent_records_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "CHK_user_consent_records_document_version" CHECK (char_length("document_version") BETWEEN 1 AND 80),
            CONSTRAINT "CHK_user_consent_records_resource_id" CHECK ("resource_id" IS NULL OR "resource_id"::text ~* '^[0-9a-f-]{36}$')
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_user_consent_records_user_type_created" ON "user_consent_records" ("user_id", "consent_type", "created_at")`)
        await queryRunner.query(`CREATE INDEX "IDX_user_consent_records_user_created" ON "user_consent_records" ("user_id", "created_at")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_consent_records_user_created"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_consent_records_user_type_created"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "user_consent_records"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "user_consent_source"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "user_consent_action"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "user_consent_type"`)
    }
}
