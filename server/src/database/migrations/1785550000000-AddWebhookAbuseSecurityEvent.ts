import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWebhookAbuseSecurityEvent1785550000000 implements MigrationInterface {
    name = 'AddWebhookAbuseSecurityEvent1785550000000'

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
                'route_scan', 'malformed_request', 'oversized_request',
                'privilege_denied', 'webhook_abuse'
            ))
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
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
    }
}
