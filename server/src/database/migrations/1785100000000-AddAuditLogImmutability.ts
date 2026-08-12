import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditLogImmutability1785100000000 implements MigrationInterface {
    name = 'AddAuditLogImmutability1785100000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF TG_OP = 'DELETE'
                    AND current_setting('app.audit_retention_cleanup', true) = 'on' THEN
                    RETURN OLD;
                END IF;

                IF TG_OP = 'UPDATE'
                    AND OLD.actor_id IS NOT NULL
                    AND NEW.actor_id IS NULL
                    AND NEW.action IS NOT DISTINCT FROM OLD.action
                    AND NEW.target_id IS NOT DISTINCT FROM OLD.target_id
                    AND NEW.target_type IS NOT DISTINCT FROM OLD.target_type
                    AND NEW.metadata IS NOT DISTINCT FROM OLD.metadata
                    AND NEW.ip_address IS NOT DISTINCT FROM OLD.ip_address
                    AND NEW.user_agent IS NOT DISTINCT FROM OLD.user_agent
                    AND NEW.correlation_id IS NOT DISTINCT FROM OLD.correlation_id
                    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt" THEN
                    RETURN NEW;
                END IF;

                RAISE EXCEPTION 'audit_logs are append-only';
            END;
            $$;
        `)
        await queryRunner.query(`
            CREATE TRIGGER trg_audit_logs_immutable
            BEFORE UPDATE OR DELETE ON "audit_logs"
            FOR EACH ROW
            EXECUTE FUNCTION prevent_audit_log_mutation();
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER "trg_audit_logs_immutable" ON "audit_logs"')
        await queryRunner.query('DROP FUNCTION "prevent_audit_log_mutation"()')
    }
}
