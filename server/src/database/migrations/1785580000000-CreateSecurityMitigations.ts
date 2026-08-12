import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSecurityMitigations1785580000000 implements MigrationInterface {
    name = 'CreateSecurityMitigations1785580000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "security_mitigations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "kind" text NOT NULL,
                "value" text NOT NULL,
                "display_value" text NOT NULL,
                "reason" text NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                "created_by" uuid NOT NULL,
                "revoked_by" uuid,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_security_mitigations_id" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_security_mitigations_kind" CHECK ("kind" IN ('ip_block')),
                CONSTRAINT "CHK_security_mitigations_value_length" CHECK (length("value") BETWEEN 3 AND 128),
                CONSTRAINT "CHK_security_mitigations_display_value_length" CHECK (length("display_value") BETWEEN 3 AND 64),
                CONSTRAINT "CHK_security_mitigations_reason_length" CHECK (length("reason") BETWEEN 1 AND 500)
            )
        `)
        await queryRunner.query(`
            ALTER TABLE "security_mitigations"
            ADD CONSTRAINT "FK_security_mitigations_created_by"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT
        `)
        await queryRunner.query(`
            ALTER TABLE "security_mitigations"
            ADD CONSTRAINT "FK_security_mitigations_revoked_by"
            FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_security_mitigations_value_expires_at" ON "security_mitigations" ("value", "expires_at")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_security_mitigations_active_lookup" ON "security_mitigations" ("value", "revoked_at", "expires_at")',
        )
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_security_mitigations_active_lookup"')
        await queryRunner.query('DROP INDEX "public"."IDX_security_mitigations_value_expires_at"')
        await queryRunner.query('ALTER TABLE "security_mitigations" DROP CONSTRAINT "FK_security_mitigations_revoked_by"')
        await queryRunner.query('ALTER TABLE "security_mitigations" DROP CONSTRAINT "FK_security_mitigations_created_by"')
        await queryRunner.query('DROP TABLE "security_mitigations"')
    }
}
