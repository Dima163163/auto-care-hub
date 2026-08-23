import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareBonusLedger1786070000000 implements MigrationInterface {
    name = 'CreateAutoCareBonusLedger1786070000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."autocare_bonus_ledger_type" AS ENUM ('earn', 'redeem', 'expire', 'adjustment')`)
        await queryRunner.query(`CREATE TABLE "autocare_bonus_programs" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providerId" uuid NOT NULL,
            "name" text NOT NULL,
            "earnPercent" numeric(5,2) NOT NULL DEFAULT 0,
            "maxEarnPointsPerVisit" integer,
            "expiresAfterDays" integer,
            "active" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_bonus_programs_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_autocare_bonus_programs_provider" UNIQUE ("providerId"),
            CONSTRAINT "FK_autocare_bonus_programs_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "CHK_autocare_bonus_program_percent" CHECK ("earnPercent" >= 0 AND "earnPercent" <= 100)
        )`)
        await queryRunner.query(`CREATE TABLE "autocare_bonus_accounts" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "clientId" uuid NOT NULL,
            "providerId" uuid NOT NULL,
            "balancePoints" integer NOT NULL DEFAULT 0,
            "earnedPoints" integer NOT NULL DEFAULT 0,
            "redeemedPoints" integer NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_bonus_accounts_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_autocare_bonus_accounts_client_provider" UNIQUE ("clientId", "providerId"),
            CONSTRAINT "FK_autocare_bonus_accounts_client" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_bonus_accounts_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "CHK_autocare_bonus_accounts_balance" CHECK ("balancePoints" >= 0)
        )`)
        await queryRunner.query(`CREATE TABLE "autocare_bonus_ledger" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "accountId" uuid NOT NULL,
            "clientId" uuid NOT NULL,
            "providerId" uuid NOT NULL,
            "requestId" uuid,
            "type" "public"."autocare_bonus_ledger_type" NOT NULL,
            "points" integer NOT NULL,
            "reason" text NOT NULL,
            "idempotencyKey" text NOT NULL,
            "expiresAt" TIMESTAMP WITH TIME ZONE,
            "actorId" uuid,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_bonus_ledger_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_autocare_bonus_ledger_account_key" UNIQUE ("accountId", "idempotencyKey"),
            CONSTRAINT "CHK_autocare_bonus_ledger_nonzero" CHECK ("points" <> 0),
            CONSTRAINT "FK_autocare_bonus_ledger_account" FOREIGN KEY ("accountId") REFERENCES "autocare_bonus_accounts"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_bonus_ledger_client" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_bonus_ledger_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_bonus_ledger_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE SET NULL,
            CONSTRAINT "FK_autocare_bonus_ledger_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_bonus_ledger_account_created" ON "autocare_bonus_ledger" ("accountId", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_bonus_ledger_account_created"`)
        await queryRunner.query(`DROP TABLE "autocare_bonus_ledger"`)
        await queryRunner.query(`DROP TABLE "autocare_bonus_accounts"`)
        await queryRunner.query(`DROP TABLE "autocare_bonus_programs"`)
        await queryRunner.query(`DROP TYPE "public"."autocare_bonus_ledger_type"`)
    }
}
