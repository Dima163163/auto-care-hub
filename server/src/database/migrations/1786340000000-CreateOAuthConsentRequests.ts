import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateOAuthConsentRequests1786340000000 implements MigrationInterface {
    name = 'CreateOAuthConsentRequests1786340000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oauth_consent_requests" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "state_hash" text NOT NULL,
            "provider" "oauth_identity_provider" NOT NULL,
            "terms_version" text NOT NULL,
            "privacy_version" text NOT NULL,
            "ip_address_hash" char(64),
            "user_agent_hash" char(64),
            "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
            "consumed_at" TIMESTAMP WITH TIME ZONE,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_oauth_consent_requests" PRIMARY KEY ("id")
        )`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_oauth_consent_requests_state_hash" ON "oauth_consent_requests" ("state_hash")`)
        await queryRunner.query(`CREATE INDEX "IDX_oauth_consent_requests_expires_at" ON "oauth_consent_requests" ("expires_at")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_oauth_consent_requests_expires_at"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_oauth_consent_requests_state_hash"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "oauth_consent_requests"`)
    }
}
