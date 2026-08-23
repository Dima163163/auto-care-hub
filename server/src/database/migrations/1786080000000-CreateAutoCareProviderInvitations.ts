import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareProviderInvitations1786080000000 implements MigrationInterface {
    name = 'CreateAutoCareProviderInvitations1786080000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "autocare_provider_invitation_role" AS ENUM ('manager', 'staff')`)
        await queryRunner.query(`CREATE TYPE "autocare_provider_invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired')`)
        await queryRunner.query(`CREATE TABLE "autocare_provider_invitations" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providerId" uuid NOT NULL,
            "email" text NOT NULL,
            "locationId" uuid,
            "role" "autocare_provider_invitation_role" NOT NULL,
            "status" "autocare_provider_invitation_status" NOT NULL DEFAULT 'pending',
            "tokenHash" char(64) NOT NULL,
            "invitedById" uuid NOT NULL,
            "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "acceptedAt" TIMESTAMP WITH TIME ZONE,
            "revokedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_provider_invitations_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_autocare_provider_invitations_token_hash" UNIQUE ("tokenHash"),
            CONSTRAINT "CHK_autocare_provider_invitations_email" CHECK (char_length("email") BETWEEN 3 AND 320),
            CONSTRAINT "FK_autocare_provider_invitations_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_provider_invitations_location" FOREIGN KEY ("locationId") REFERENCES "autocare_service_locations"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_provider_invitations_invited_by" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_provider_invitations_provider_status" ON "autocare_provider_invitations" ("providerId", "status", "createdAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_provider_invitations_email_status" ON "autocare_provider_invitations" ("email", "status")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_provider_invitations_pending_scope" ON "autocare_provider_invitations" ("providerId", "email", "role", COALESCE("locationId", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "status" = 'pending'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_provider_invitations_pending_scope"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_provider_invitations_email_status"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_provider_invitations_provider_status"`)
        await queryRunner.query(`DROP TABLE "autocare_provider_invitations"`)
        await queryRunner.query(`DROP TYPE "autocare_provider_invitation_status"`)
        await queryRunner.query(`DROP TYPE "autocare_provider_invitation_role"`)
    }
}
