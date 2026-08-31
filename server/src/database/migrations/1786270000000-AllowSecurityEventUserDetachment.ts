import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Account deletion must detach security-event user references without making
 * the event stream mutable. The existing privacy cleanup guard already
 * requires a local transaction flag, null PII fields and a redaction marker;
 * this migration extends that bounded path to allow user_id -> NULL.
 */
export class AllowSecurityEventUserDetachment1786270000000 implements MigrationInterface {
    name = 'AllowSecurityEventUserDetachment1786270000000'

    async up(queryRunner: QueryRunner): Promise<void> {
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

                IF TG_OP = 'UPDATE'
                    AND current_setting('app.security_event_privacy_cleanup', true) = 'on'
                    AND NEW.id IS NOT DISTINCT FROM OLD.id
                    AND (NEW.user_id IS NULL OR NEW.user_id IS NOT DISTINCT FROM OLD.user_id)
                    AND NEW.type IS NOT DISTINCT FROM OLD.type
                    AND NEW.failed_login_attempts IS NOT DISTINCT FROM OLD.failed_login_attempts
                    AND NEW.locked_until IS NOT DISTINCT FROM OLD.locked_until
                    AND NEW.correlation_id IS NOT DISTINCT FROM OLD.correlation_id
                    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
                    AND NEW.method IS NOT DISTINCT FROM OLD.method
                    AND NEW.route IS NOT DISTINCT FROM OLD.route
                    AND NEW.status_code IS NOT DISTINCT FROM OLD.status_code
                    AND NEW.actor_role IS NOT DISTINCT FROM OLD.actor_role
                    AND NEW.auth_outcome IS NOT DISTINCT FROM OLD.auth_outcome
                    AND NEW.rate_limit_result IS NOT DISTINCT FROM OLD.rate_limit_result
                    AND NEW.request_size_bytes IS NOT DISTINCT FROM OLD.request_size_bytes
                    AND NEW.reason_code IS NOT DISTINCT FROM OLD.reason_code
                    AND NEW.proxy_provenance IS NOT DISTINCT FROM OLD.proxy_provenance
                    AND NEW.ip_address IS NULL
                    AND NEW.user_agent IS NULL
                    AND NEW.metadata ? 'privacyRedactedAt'
                    AND NOT (NEW.metadata ? 'ipAddress') THEN
                    RETURN NEW;
                END IF;

                RAISE EXCEPTION 'security_events are append-only';
            END;
            $$
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
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

                IF TG_OP = 'UPDATE'
                    AND current_setting('app.security_event_privacy_cleanup', true) = 'on'
                    AND NEW.id IS NOT DISTINCT FROM OLD.id
                    AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
                    AND NEW.type IS NOT DISTINCT FROM OLD.type
                    AND NEW.failed_login_attempts IS NOT DISTINCT FROM OLD.failed_login_attempts
                    AND NEW.locked_until IS NOT DISTINCT FROM OLD.locked_until
                    AND NEW.correlation_id IS NOT DISTINCT FROM OLD.correlation_id
                    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
                    AND NEW.method IS NOT DISTINCT FROM OLD.method
                    AND NEW.route IS NOT DISTINCT FROM OLD.route
                    AND NEW.status_code IS NOT DISTINCT FROM OLD.status_code
                    AND NEW.actor_role IS NOT DISTINCT FROM OLD.actor_role
                    AND NEW.auth_outcome IS NOT DISTINCT FROM OLD.auth_outcome
                    AND NEW.rate_limit_result IS NOT DISTINCT FROM OLD.rate_limit_result
                    AND NEW.request_size_bytes IS NOT DISTINCT FROM OLD.request_size_bytes
                    AND NEW.reason_code IS NOT DISTINCT FROM OLD.reason_code
                    AND NEW.proxy_provenance IS NOT DISTINCT FROM OLD.proxy_provenance
                    AND NEW.ip_address IS NULL
                    AND NEW.user_agent IS NULL
                    AND NEW.metadata ? 'privacyRedactedAt'
                    AND NOT (NEW.metadata ? 'ipAddress') THEN
                    RETURN NEW;
                END IF;

                RAISE EXCEPTION 'security_events are append-only';
            END;
            $$
        `)
    }
}
