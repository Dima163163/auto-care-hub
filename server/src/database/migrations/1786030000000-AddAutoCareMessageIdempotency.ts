import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareMessageIdempotency1786030000000 implements MigrationInterface {
    name = 'AddAutoCareMessageIdempotency1786030000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD "idempotencyKey" character varying(128)`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD "idempotencyFingerprint" character(64)`)
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_autocare_service_messages_idempotency" ON "autocare_service_messages" ("requestId", "senderId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_service_messages_idempotency"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP COLUMN "idempotencyFingerprint"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP COLUMN "idempotencyKey"`)
    }
}
