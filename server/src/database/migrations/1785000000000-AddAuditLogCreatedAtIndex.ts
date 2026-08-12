import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditLogCreatedAtIndex1785000000000 implements MigrationInterface {
    name = 'AddAuditLogCreatedAtIndex1785000000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("createdAt")',
        )
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_audit_logs_created_at"')
    }
}
