import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSecurityEventContext1785560000000 implements MigrationInterface {
    name = 'AddSecurityEventContext1785560000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD "actor_role" text,
            ADD "auth_outcome" text NOT NULL DEFAULT 'unknown',
            ADD "rate_limit_result" text NOT NULL DEFAULT 'not_checked',
            ADD "request_size_bytes" integer,
            ADD "reason_code" text,
            ADD "proxy_provenance" text NOT NULL DEFAULT 'unknown'
        `)
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD CONSTRAINT "CHK_security_events_actor_role"
            CHECK ("actor_role" IS NULL OR "actor_role" IN ('client', 'owner', 'admin', 'super_admin')),
            ADD CONSTRAINT "CHK_security_events_auth_outcome"
            CHECK ("auth_outcome" IN ('unknown', 'anonymous', 'authenticated', 'failed')),
            ADD CONSTRAINT "CHK_security_events_rate_limit_result"
            CHECK ("rate_limit_result" IN ('not_checked', 'allowed', 'blocked')),
            ADD CONSTRAINT "CHK_security_events_request_size"
            CHECK ("request_size_bytes" IS NULL OR "request_size_bytes" BETWEEN 0 AND 50000000),
            ADD CONSTRAINT "CHK_security_events_reason_code"
            CHECK ("reason_code" IS NULL OR char_length("reason_code") BETWEEN 1 AND 96),
            ADD CONSTRAINT "CHK_security_events_proxy_provenance"
            CHECK ("proxy_provenance" IN ('unknown', 'direct', 'trusted_proxy', 'forwarded_header_untrusted'))
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_security_events_auth_outcome_created_at_id" ON "security_events" ("auth_outcome", "createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_security_events_rate_limit_created_at_id" ON "security_events" ("rate_limit_result", "createdAt", "id")',
        )
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_security_events_rate_limit_created_at_id"')
        await queryRunner.query('DROP INDEX "public"."IDX_security_events_auth_outcome_created_at_id"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_proxy_provenance"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_reason_code"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_request_size"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_rate_limit_result"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_auth_outcome"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_actor_role"')
        await queryRunner.query(`
            ALTER TABLE "security_events"
            DROP COLUMN "proxy_provenance",
            DROP COLUMN "reason_code",
            DROP COLUMN "request_size_bytes",
            DROP COLUMN "rate_limit_result",
            DROP COLUMN "auth_outcome",
            DROP COLUMN "actor_role"
        `)
    }
}
