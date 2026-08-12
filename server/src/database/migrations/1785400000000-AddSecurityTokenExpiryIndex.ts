import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSecurityTokenExpiryIndex1785400000000 implements MigrationInterface {
    name = 'AddSecurityTokenExpiryIndex1785400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE INDEX "IDX_security_tokens_expires_at" ON "security_tokens" ("expiresAt")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP INDEX "public"."IDX_security_tokens_expires_at"',
        )
    }
}
