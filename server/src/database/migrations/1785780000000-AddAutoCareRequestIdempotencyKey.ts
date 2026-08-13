import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareRequestIdempotencyKey1785780000000 implements MigrationInterface {
    name = 'AddAutoCareRequestIdempotencyKey1785780000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_service_requests" ADD "idempotency_key" character varying(128)')
        await queryRunner.query('CREATE UNIQUE INDEX "IDX_autocare_service_requests_client_idempotency_key" ON "autocare_service_requests" ("clientId", "idempotency_key")')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_autocare_service_requests_client_idempotency_key"')
        await queryRunner.query('ALTER TABLE "autocare_service_requests" DROP COLUMN "idempotency_key"')
    }
}
