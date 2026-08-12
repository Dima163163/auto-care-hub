import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditLogCorrelationId1784180000000
    implements MigrationInterface
{
    name = 'AddAuditLogCorrelationId1784180000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "audit_logs" ADD "correlation_id" text',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_audit_logs_correlation_id" ON "audit_logs" ("correlation_id")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP INDEX "public"."IDX_audit_logs_correlation_id"',
        )
        await queryRunner.query(
            'ALTER TABLE "audit_logs" DROP COLUMN "correlation_id"',
        )
    }
}
