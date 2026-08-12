import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSecurityEventActionAssignee1785600000000 implements MigrationInterface {
    name = 'AddSecurityEventActionAssignee1785600000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "security_event_actions"
            ADD "assignee_id" uuid,
            ADD CONSTRAINT "FK_security_event_actions_assignee"
                FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_security_event_actions_assignee_created_at" ON "security_event_actions" ("assignee_id", "created_at", "id")',
        )
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_security_event_actions_assignee_created_at"')
        await queryRunner.query(
            'ALTER TABLE "security_event_actions" DROP CONSTRAINT "FK_security_event_actions_assignee"',
        )
        await queryRunner.query('ALTER TABLE "security_event_actions" DROP COLUMN "assignee_id"')
    }
}
