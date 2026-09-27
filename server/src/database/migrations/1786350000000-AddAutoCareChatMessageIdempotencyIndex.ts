import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareChatMessageIdempotencyIndex1786350000000 implements MigrationInterface {
    name = 'AddAutoCareChatMessageIdempotencyIndex1786350000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_autocare_service_messages_thread_idempotency" ON "autocare_service_messages" ("threadId", "senderId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_autocare_service_messages_thread_idempotency"`)
    }
}
