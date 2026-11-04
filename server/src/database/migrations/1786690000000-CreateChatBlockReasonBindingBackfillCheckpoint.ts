import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateChatBlockReasonBindingBackfillCheckpoint1786690000000 implements MigrationInterface {
    name = 'CreateChatBlockReasonBindingBackfillCheckpoint1786690000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_chat_blocks" ADD "reasonBinding" text')
        await queryRunner.query(`CREATE TABLE "chat_block_reason_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "chat_block_reason_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_chat_blocks" DROP COLUMN "reasonBinding"')
    }
}
