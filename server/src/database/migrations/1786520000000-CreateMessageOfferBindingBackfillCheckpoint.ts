import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMessageOfferBindingBackfillCheckpoint1786520000000 implements MigrationInterface {
    name = 'CreateMessageOfferBindingBackfillCheckpoint1786520000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_messages" ADD "offerBinding" text')
        await queryRunner.query(`CREATE TABLE "message_offer_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "message_offer_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_service_messages" DROP COLUMN "offerBinding"')
    }
}
