import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBroadcastOfferBindingBackfillCheckpoint1786760000000 implements MigrationInterface {
    name = 'CreateBroadcastOfferBindingBackfillCheckpoint1786760000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_broadcast_offers" ADD "offerSnapshotBinding" text')
        await queryRunner.query(`CREATE TABLE "broadcast_offer_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "broadcast_offer_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_broadcast_offers" DROP COLUMN "offerSnapshotBinding"')
    }
}
