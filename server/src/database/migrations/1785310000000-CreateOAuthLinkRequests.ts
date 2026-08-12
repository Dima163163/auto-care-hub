import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateOAuthLinkRequests1785310000000 implements MigrationInterface {
    name = 'CreateOAuthLinkRequests1785310000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."oauth_link_request_purpose" AS ENUM ('link', 'unlink')
        `)
        await queryRunner.query(`
            CREATE TABLE "oauth_link_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "state_hash" text NOT NULL,
                "purpose" "public"."oauth_link_request_purpose" NOT NULL,
                "provider" "public"."oauth_identity_provider" NOT NULL,
                "user_id" uuid NOT NULL,
                "identity_id" uuid,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "consumed_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_oauth_link_requests_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_oauth_link_requests_state_hash" UNIQUE ("state_hash"),
                CONSTRAINT "FK_oauth_link_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_oauth_link_requests_identity" FOREIGN KEY ("identity_id") REFERENCES "oauth_identities"("id") ON DELETE CASCADE
            )
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_oauth_link_requests_user_provider" ON "oauth_link_requests" ("user_id", "provider")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_oauth_link_requests_user_provider"')
        await queryRunner.query('DROP TABLE "oauth_link_requests"')
        await queryRunner.query('DROP TYPE "public"."oauth_link_request_purpose"')
    }
}
