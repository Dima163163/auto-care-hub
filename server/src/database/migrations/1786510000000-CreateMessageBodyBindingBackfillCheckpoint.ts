import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMessageBodyBindingBackfillCheckpoint1786510000000 implements MigrationInterface {
    name = 'CreateMessageBodyBindingBackfillCheckpoint1786510000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_messages" ADD "bodyBinding" text')
        await queryRunner.query(`CREATE TABLE "message_body_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "message_body_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_service_messages" DROP COLUMN "bodyBinding"')
    }
}
