import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateProviderChangeRequestBindingBackfillCheckpoint1786710000000 implements MigrationInterface {
    name = 'CreateProviderChangeRequestBindingBackfillCheckpoint1786710000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_provider_change_requests" ADD "payloadBinding" text, ADD "reviewReasonBinding" text')
        await queryRunner.query(`CREATE TABLE "provider_change_request_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "provider_change_request_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_provider_change_requests" DROP COLUMN "payloadBinding", DROP COLUMN "reviewReasonBinding"')
    }
}
