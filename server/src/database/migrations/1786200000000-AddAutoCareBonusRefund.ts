import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * A refund is not a manual adjustment: it is an automatic, auditable reversal
 * of a redemption after an eligible cancellation.
 */
export class AddAutoCareBonusRefund1786200000000 implements MigrationInterface {
    name = 'AddAutoCareBonusRefund1786200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."autocare_bonus_ledger_type" ADD VALUE IF NOT EXISTS 'refund'`)
    }

    public async down(): Promise<void> {
        // PostgreSQL enum values cannot be removed safely without rebuilding
        // the type and rewriting dependent tables. Keep this migration forward-only.
    }
}
