import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateChatSubjectBindingBackfillCheckpoint1786530000000 implements MigrationInterface {
    name = 'CreateChatSubjectBindingBackfillCheckpoint1786530000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_chat_threads" ADD "subjectBinding" text')
        await queryRunner.query(`CREATE TABLE "chat_subject_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "chat_subject_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_chat_threads" DROP COLUMN "subjectBinding"')
    }
}
