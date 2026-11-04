import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBroadcastRequestBindingBackfillCheckpoint1786750000000 implements MigrationInterface {
    name = 'CreateBroadcastRequestBindingBackfillCheckpoint1786750000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_broadcast_requests" ADD "issueDescriptionBinding" text, ADD "vehicleSnapshotBinding" text')
        await queryRunner.query(`CREATE TABLE "broadcast_request_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "broadcast_request_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_broadcast_requests" DROP COLUMN "issueDescriptionBinding", DROP COLUMN "vehicleSnapshotBinding"')
    }
}
