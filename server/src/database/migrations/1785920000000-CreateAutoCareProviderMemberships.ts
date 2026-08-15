import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareProviderMemberships1785920000000 implements MigrationInterface {
    name = 'CreateAutoCareProviderMemberships1785920000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "autocare_provider_membership_role" AS ENUM ('owner', 'manager', 'staff')`)
        await queryRunner.query(`CREATE TYPE "autocare_provider_membership_status" AS ENUM ('active', 'revoked')`)
        await queryRunner.query(`CREATE TABLE "autocare_provider_memberships" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providerId" uuid NOT NULL,
            "userId" uuid NOT NULL,
            "locationId" uuid,
            "role" "autocare_provider_membership_role" NOT NULL,
            "status" "autocare_provider_membership_status" NOT NULL DEFAULT 'active',
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_provider_memberships_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_provider_memberships_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_provider_memberships_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_provider_memberships_location" FOREIGN KEY ("locationId") REFERENCES "autocare_service_locations"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_provider_memberships_user" ON "autocare_provider_memberships" ("userId", "status", "providerId")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_provider_memberships_scope" ON "autocare_provider_memberships" ("providerId", "userId", COALESCE("locationId", '00000000-0000-0000-0000-000000000000'::uuid))`)
        await queryRunner.query(`INSERT INTO "autocare_provider_memberships" ("providerId", "userId", "locationId", "role", "status")
            SELECT "id", "ownerId", NULL, 'owner', 'active'
            FROM "autocare_providers"
            WHERE "ownerId" IS NOT NULL
            ON CONFLICT DO NOTHING`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_provider_memberships_scope"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_provider_memberships_user"`)
        await queryRunner.query(`DROP TABLE "autocare_provider_memberships"`)
        await queryRunner.query(`DROP TYPE "autocare_provider_membership_status"`)
        await queryRunner.query(`DROP TYPE "autocare_provider_membership_role"`)
    }
}
