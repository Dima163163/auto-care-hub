import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateOAuthIdentities1785300000000 implements MigrationInterface {
    name = 'CreateOAuthIdentities1785300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'oauth_identity_provider'
                ) THEN
                    CREATE TYPE "public"."oauth_identity_provider" AS ENUM ('google', 'yandex');
                END IF;
            END $$;
        `)
        await queryRunner.query(`
            CREATE TABLE "oauth_identities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "provider" "public"."oauth_identity_provider" NOT NULL,
                "provider_subject" text NOT NULL,
                "user_id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_oauth_identities_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_oauth_identities_provider_subject" UNIQUE ("provider", "provider_subject"),
                CONSTRAINT "FK_oauth_identities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_oauth_identities_user_id" ON "oauth_identities" ("user_id")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_oauth_identities_user_id"')
        await queryRunner.query('DROP TABLE "oauth_identities"')
        await queryRunner.query('DROP TYPE "public"."oauth_identity_provider"')
    }
}
