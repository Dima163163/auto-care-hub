import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePrivilegedMfaFactors1786810000000 implements MigrationInterface {
    name = 'CreatePrivilegedMfaFactors1786810000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "user_sessions" ADD "mfa_verified_at" timestamptz')
        await queryRunner.query(`CREATE TABLE "user_mfa_factors" (
            "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
            "secret_ciphertext" text NOT NULL,
            "last_accepted_counter" integer NOT NULL DEFAULT -1 CHECK ("last_accepted_counter" >= -1),
            "created_at" timestamptz NOT NULL DEFAULT now()
        )`)
        await queryRunner.query(`CREATE TABLE "user_mfa_recovery_codes" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "code_hash" text NOT NULL CHECK ("code_hash" ~ '^[0-9a-f]{64}$'),
            "consumed_at" timestamptz,
            "created_at" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_user_mfa_recovery_code_hash" UNIQUE ("user_id", "code_hash")
        )`)
        await queryRunner.query('CREATE INDEX "IDX_user_mfa_recovery_codes_user_id" ON "user_mfa_recovery_codes" ("user_id")')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "user_mfa_recovery_codes"')
        await queryRunner.query('DROP TABLE "user_mfa_factors"')
        await queryRunner.query('ALTER TABLE "user_sessions" DROP COLUMN "mfa_verified_at"')
    }
}
