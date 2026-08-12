import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpandSecurityEventVisibility1785540000000 implements MigrationInterface {
    name = 'ExpandSecurityEventVisibility1785540000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_type"',
        )
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD CONSTRAINT "CHK_security_events_type"
            CHECK ("type" IN (
                'login_failed', 'account_locked', 'refresh_token_reuse',
                'rate_limit_exceeded', 'invalid_token', 'csrf_violation',
                'route_scan', 'malformed_request', 'oversized_request', 'privilege_denied'
            ))
        `)
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD "severity" text NOT NULL DEFAULT 'warning',
            ADD "method" text,
            ADD "route" text,
            ADD "status_code" integer,
            ADD "request_id" text,
            ADD "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
        `)
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD CONSTRAINT "CHK_security_events_severity"
            CHECK ("severity" IN ('info', 'warning', 'high', 'critical'))
        `)
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD CONSTRAINT "CHK_security_events_status_code"
            CHECK ("status_code" IS NULL OR "status_code" BETWEEN 100 AND 599)
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_security_events_ip_created_at_id" ON "security_events" ("ip_address", "createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_security_events_route_created_at_id" ON "security_events" ("route", "createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_security_events_severity_created_at_id" ON "security_events" ("severity", "createdAt", "id")',
        )
        await queryRunner.query(`
            CREATE TABLE "security_event_actions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "security_event_id" uuid NOT NULL,
                "actor_id" uuid NOT NULL,
                "status" text NOT NULL,
                "operator_note" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_security_event_actions_id" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_security_event_actions_status"
                    CHECK ("status" IN ('acknowledged', 'investigating', 'resolved', 'suppressed')),
                CONSTRAINT "FK_security_event_actions_event"
                    FOREIGN KEY ("security_event_id") REFERENCES "security_events"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_security_event_actions_actor"
                    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT
            )
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_security_event_actions_event_created_at" ON "security_event_actions" ("security_event_id", "created_at", "id")',
        )
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION prevent_security_event_action_mutation()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RAISE EXCEPTION 'security_event_actions are append-only';
            END;
            $$
        `)
        await queryRunner.query(`
            CREATE TRIGGER "trg_security_event_actions_immutable"
            BEFORE UPDATE OR DELETE ON "security_event_actions"
            FOR EACH ROW
            EXECUTE FUNCTION prevent_security_event_action_mutation()
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER "trg_security_event_actions_immutable" ON "security_event_actions"')
        await queryRunner.query('DROP FUNCTION "prevent_security_event_action_mutation"()')
        await queryRunner.query('DROP INDEX "public"."IDX_security_event_actions_event_created_at"')
        await queryRunner.query('ALTER TABLE "security_event_actions" DROP CONSTRAINT "FK_security_event_actions_actor"')
        await queryRunner.query('ALTER TABLE "security_event_actions" DROP CONSTRAINT "FK_security_event_actions_event"')
        await queryRunner.query('DROP TABLE "security_event_actions"')
        await queryRunner.query('DROP INDEX "public"."IDX_security_events_severity_created_at_id"')
        await queryRunner.query('DROP INDEX "public"."IDX_security_events_route_created_at_id"')
        await queryRunner.query('DROP INDEX "public"."IDX_security_events_ip_created_at_id"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_status_code"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_severity"')
        await queryRunner.query('ALTER TABLE "security_events" DROP COLUMN "metadata"')
        await queryRunner.query('ALTER TABLE "security_events" DROP COLUMN "request_id"')
        await queryRunner.query('ALTER TABLE "security_events" DROP COLUMN "status_code"')
        await queryRunner.query('ALTER TABLE "security_events" DROP COLUMN "route"')
        await queryRunner.query('ALTER TABLE "security_events" DROP COLUMN "method"')
        await queryRunner.query('ALTER TABLE "security_events" DROP COLUMN "severity"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_type"')
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD CONSTRAINT "CHK_security_events_type"
            CHECK ("type" IN ('login_failed', 'account_locked', 'refresh_token_reuse'))
        `)
    }
}
