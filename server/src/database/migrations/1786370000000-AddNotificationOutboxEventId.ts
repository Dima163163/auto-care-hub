import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNotificationOutboxEventId1786370000000 implements MigrationInterface {
    name = 'AddNotificationOutboxEventId1786370000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "outboxEventId" uuid`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notifications_outbox_event" ON "notifications" ("outboxEventId")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_notifications_outbox_event"`)
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "outboxEventId"`)
    }
}
