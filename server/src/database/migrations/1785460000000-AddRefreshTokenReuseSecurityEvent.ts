import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRefreshTokenReuseSecurityEvent1785460000000 implements MigrationInterface {
    name = 'AddRefreshTokenReuseSecurityEvent1785460000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_type"',
        )
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD CONSTRAINT "CHK_security_events_type"
            CHECK ("type" IN ('login_failed', 'account_locked', 'refresh_token_reuse'))
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        const rows = await queryRunner.query(`
            SELECT COUNT(*)::int AS count
            FROM "security_events"
            WHERE "type" = 'refresh_token_reuse'
        `) as Array<{ count?: number | string }>

        if (Number(rows[0]?.count ?? 0) > 0) {
            throw new Error(
                'Cannot revert refresh-token security events while retained rows exist.',
            )
        }

        await queryRunner.query(
            'ALTER TABLE "security_events" DROP CONSTRAINT "CHK_security_events_type"',
        )
        await queryRunner.query(`
            ALTER TABLE "security_events"
            ADD CONSTRAINT "CHK_security_events_type"
            CHECK ("type" IN ('login_failed', 'account_locked'))
        `)
    }
}
