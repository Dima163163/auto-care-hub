import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSessionRevocationMetadata1785420000000 implements MigrationInterface {
    name = 'AddSessionRevocationMetadata1785420000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "user_sessions" ADD "revoked_at" TIMESTAMPTZ',
        )
        await queryRunner.query(
            'ALTER TABLE "user_sessions" ADD "revocation_reason" text',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_user_sessions_revoked_at" ON "user_sessions" ("revoked_at")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP INDEX "public"."IDX_user_sessions_revoked_at"',
        )
        await queryRunner.query(
            'ALTER TABLE "user_sessions" DROP COLUMN "revocation_reason"',
        )
        await queryRunner.query(
            'ALTER TABLE "user_sessions" DROP COLUMN "revoked_at"',
        )
    }
}
