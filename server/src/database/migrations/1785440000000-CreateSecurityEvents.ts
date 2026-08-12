import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSecurityEvents1785440000000 implements MigrationInterface {
    name = 'CreateSecurityEvents1785440000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "security_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid,
                "type" text NOT NULL,
                "failed_login_attempts" integer,
                "locked_until" TIMESTAMP WITH TIME ZONE,
                "ip_address" text,
                "user_agent" text,
                "correlation_id" text,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_security_events_id" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_security_events_failed_attempts"
                    CHECK ("failed_login_attempts" IS NULL OR "failed_login_attempts" >= 1),
                CONSTRAINT "CHK_security_events_type"
                    CHECK ("type" IN ('login_failed', 'account_locked'))
            )
        `)
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD CONSTRAINT "FK_security_events_user_id"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_security_events_user_created_at_id" ON "security_events" ("user_id", "createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_security_events_type_created_at_id" ON "security_events" ("type", "createdAt", "id")',
        )
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION prevent_security_event_mutation()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF TG_OP = 'DELETE'
                    AND current_setting('app.security_event_retention_cleanup', true) = 'on' THEN
                    RETURN OLD;
                END IF;

                RAISE EXCEPTION 'security_events are append-only';
            END;
            $$
        `)
        await queryRunner.query(`
            CREATE TRIGGER "trg_security_events_immutable"
            BEFORE UPDATE OR DELETE ON "security_events"
            FOR EACH ROW
            EXECUTE FUNCTION prevent_security_event_mutation()
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER "trg_security_events_immutable" ON "security_events"')
        await queryRunner.query('DROP FUNCTION "prevent_security_event_mutation"()')
        await queryRunner.query('DROP INDEX "public"."IDX_security_events_type_created_at_id"')
        await queryRunner.query('DROP INDEX "public"."IDX_security_events_user_created_at_id"')
        await queryRunner.query('ALTER TABLE "security_events" DROP CONSTRAINT "FK_security_events_user_id"')
        await queryRunner.query('DROP TABLE "security_events"')
    }
}
