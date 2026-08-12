import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserSessionExpiryIndex1785390000000 implements MigrationInterface {
    name = 'AddUserSessionExpiryIndex1785390000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE INDEX "IDX_user_sessions_expires_at" ON "user_sessions" ("expiresAt")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP INDEX "public"."IDX_user_sessions_expires_at"',
        )
    }
}
