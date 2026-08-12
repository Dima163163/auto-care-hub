import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAdminListIndexes1785360000000 implements MigrationInterface {
    name = 'AddAdminListIndexes1785360000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE INDEX "IDX_users_created_at_id" ON "users" ("createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_users_role_status_created_at" ON "users" ("role", "status", "createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_booking_payments_created_at_id" ON "booking_payments" ("createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_booking_payments_status_created_at" ON "booking_payments" ("status", "createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_system_incidents_last_occurred_id" ON "system_incidents" ("last_occurred_at", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_audit_logs_created_at_id" ON "audit_logs" ("createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_audit_logs_action_created_at" ON "audit_logs" ("action", "createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_audit_logs_target_type_created_at" ON "audit_logs" ("target_type", "createdAt", "id")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_audit_logs_actor_created_at" ON "audit_logs" ("actor_id", "createdAt", "id")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_audit_logs_actor_created_at"')
        await queryRunner.query('DROP INDEX "public"."IDX_audit_logs_target_type_created_at"')
        await queryRunner.query('DROP INDEX "public"."IDX_audit_logs_action_created_at"')
        await queryRunner.query('DROP INDEX "public"."IDX_audit_logs_created_at_id"')
        await queryRunner.query('DROP INDEX "public"."IDX_system_incidents_last_occurred_id"')
        await queryRunner.query('DROP INDEX "public"."IDX_booking_payments_status_created_at"')
        await queryRunner.query('DROP INDEX "public"."IDX_booking_payments_created_at_id"')
        await queryRunner.query('DROP INDEX "public"."IDX_users_role_status_created_at"')
        await queryRunner.query('DROP INDEX "public"."IDX_users_created_at_id"')
    }
}
