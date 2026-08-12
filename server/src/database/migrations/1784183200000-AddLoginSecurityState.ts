import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLoginSecurityState1784183200000 implements MigrationInterface {
    name = 'AddLoginSecurityState1784183200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "users" ADD "failedLoginAttempts" integer NOT NULL DEFAULT 0',
        )
        await queryRunner.query(
            'ALTER TABLE "users" ADD "lockedUntil" TIMESTAMP WITH TIME ZONE',
        )
        await queryRunner.query(
            'ALTER TABLE "users" ADD "lastFailedLoginAt" TIMESTAMP WITH TIME ZONE',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "lastFailedLoginAt"')
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "lockedUntil"')
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "failedLoginAttempts"')
    }
}
