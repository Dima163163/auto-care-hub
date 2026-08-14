import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMarketplaceParityFoundation1785900000000 implements MigrationInterface {
    name = 'CreateMarketplaceParityFoundation1785900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "trustScore" numeric(5,2) NOT NULL DEFAULT 0`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "trustBadge" text`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "trustReassessedAt" TIMESTAMP WITH TIME ZONE`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "supportsMobile" boolean NOT NULL DEFAULT false`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "supportsPickup" boolean NOT NULL DEFAULT false`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "coverageRadiusKm" numeric(7,2)`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "dispatchBasePriceMinor" integer NOT NULL DEFAULT 0`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "etaMinutes" integer`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" ADD "verifiedVisit" boolean NOT NULL DEFAULT false`)

        await queryRunner.query(`CREATE TABLE "autocare_price_benchmarks" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "marketId" uuid,
            "serviceDefinitionId" uuid NOT NULL,
            "makeId" text,
            "modelId" text,
            "fuelType" text,
            "engineLiters" numeric(4,1),
            "minPriceMinor" integer NOT NULL,
            "medianPriceMinor" integer NOT NULL,
            "maxPriceMinor" integer NOT NULL,
            "currencyCode" text NOT NULL,
            "methodology" jsonb NOT NULL DEFAULT '{}',
            "source" text NOT NULL DEFAULT 'autocare',
            "active" boolean NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_price_benchmarks_id" PRIMARY KEY ("id"),
            CONSTRAINT "CHK_autocare_price_benchmarks_range" CHECK ("minPriceMinor" >= 0 AND "minPriceMinor" <= "medianPriceMinor" AND "medianPriceMinor" <= "maxPriceMinor"),
            CONSTRAINT "FK_autocare_price_benchmarks_market" FOREIGN KEY ("marketId") REFERENCES "autocare_markets"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_price_benchmarks_definition" FOREIGN KEY ("serviceDefinitionId") REFERENCES "autocare_service_definitions"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_price_benchmarks_lookup" ON "autocare_price_benchmarks" ("marketId", "serviceDefinitionId", "makeId", "modelId", "active")`)

        await queryRunner.query(`CREATE TABLE "autocare_trust_evidence" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providerId" uuid NOT NULL,
            "kind" text NOT NULL,
            "label" text NOT NULL,
            "status" text NOT NULL DEFAULT 'pending',
            "expiresAt" TIMESTAMP WITH TIME ZONE,
            "reference" text,
            "notes" text,
            "verifiedById" uuid,
            "verifiedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_trust_evidence_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_trust_evidence_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_trust_evidence_lookup" ON "autocare_trust_evidence" ("providerId", "status", "expiresAt")`)

        await queryRunner.query(`CREATE TABLE "autocare_repair_events" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "requestId" uuid NOT NULL,
            "eventType" text NOT NULL,
            "actorId" uuid,
            "title" text NOT NULL,
            "notes" text,
            "metadata" jsonb NOT NULL DEFAULT '{}',
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_repair_events_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_repair_events_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_repair_events_request" ON "autocare_repair_events" ("requestId", "createdAt")`)

        await queryRunner.query(`CREATE TABLE "autocare_broadcast_requests" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "clientId" uuid NOT NULL,
            "serviceDefinitionId" uuid NOT NULL,
            "marketId" uuid,
            "issueDescription" text NOT NULL,
            "vehicleSnapshot" jsonb,
            "photoUrls" text[] NOT NULL DEFAULT '{}',
            "preferredAt" TIMESTAMP WITH TIME ZONE,
            "status" text NOT NULL DEFAULT 'open',
            "maxProviders" integer NOT NULL DEFAULT 5,
            "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_broadcast_requests_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_broadcast_requests_client" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_broadcast_requests_definition" FOREIGN KEY ("serviceDefinitionId") REFERENCES "autocare_service_definitions"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_broadcast_requests_market" FOREIGN KEY ("marketId") REFERENCES "autocare_markets"("id") ON DELETE SET NULL
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_broadcast_requests_client" ON "autocare_broadcast_requests" ("clientId", "status", "createdAt")`)

        await queryRunner.query(`CREATE TABLE "autocare_broadcast_offers" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "broadcastRequestId" uuid NOT NULL,
            "providerId" uuid NOT NULL,
            "locationId" uuid NOT NULL,
            "offerSnapshot" jsonb NOT NULL,
            "status" text NOT NULL DEFAULT 'pending',
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_broadcast_offers_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_autocare_broadcast_offers_provider" UNIQUE ("broadcastRequestId", "providerId"),
            CONSTRAINT "FK_autocare_broadcast_offers_request" FOREIGN KEY ("broadcastRequestId") REFERENCES "autocare_broadcast_requests"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_broadcast_offers_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_broadcast_offers_location" FOREIGN KEY ("locationId") REFERENCES "autocare_service_locations"("id") ON DELETE CASCADE
        )`)

        await queryRunner.query(`CREATE TABLE "autocare_guarantee_claims" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "requestId" uuid NOT NULL,
            "clientId" uuid NOT NULL,
            "providerId" uuid NOT NULL,
            "claimType" text NOT NULL,
            "status" text NOT NULL DEFAULT 'submitted',
            "summary" text NOT NULL,
            "evidenceUrls" text[] NOT NULL DEFAULT '{}',
            "resolution" text,
            "resolvedById" uuid,
            "resolvedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_guarantee_claims_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_guarantee_claims_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_guarantee_claims_client" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_guarantee_claims_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_guarantee_claims_provider" ON "autocare_guarantee_claims" ("providerId", "status", "createdAt")`)

        await queryRunner.query(`CREATE TABLE "autocare_expert_questions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "clientId" uuid NOT NULL,
            "vehicleSnapshot" jsonb,
            "symptoms" text NOT NULL,
            "categorySlug" text,
            "status" text NOT NULL DEFAULT 'open',
            "answer" text,
            "answeredById" uuid,
            "answeredAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_expert_questions_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_expert_questions_client" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_expert_questions_client" ON "autocare_expert_questions" ("clientId", "status", "createdAt")`)

        await queryRunner.query(`CREATE TABLE "autocare_fleet_accounts" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "ownerId" uuid NOT NULL,
            "name" text NOT NULL,
            "notes" text,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_fleet_accounts_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_fleet_accounts_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_fleet_accounts_owner" ON "autocare_fleet_accounts" ("ownerId", "createdAt")`)
        await queryRunner.query(`CREATE TABLE "autocare_fleet_vehicles" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "fleetId" uuid NOT NULL,
            "label" text NOT NULL,
            "vehicleSnapshot" jsonb NOT NULL,
            "approvalPolicy" text,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_fleet_vehicles_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_autocare_fleet_vehicles_fleet" FOREIGN KEY ("fleetId") REFERENCES "autocare_fleet_accounts"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_fleet_vehicles_fleet" ON "autocare_fleet_vehicles" ("fleetId", "createdAt")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_autocare_reviews_verified_request" ON "autocare_reviews" ("serviceRequestId") WHERE "serviceRequestId" IS NOT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_reviews_verified_request"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_fleet_vehicles_fleet"`)
        await queryRunner.query(`DROP TABLE "autocare_fleet_vehicles"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_fleet_accounts_owner"`)
        await queryRunner.query(`DROP TABLE "autocare_fleet_accounts"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_expert_questions_client"`)
        await queryRunner.query(`DROP TABLE "autocare_expert_questions"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_guarantee_claims_provider"`)
        await queryRunner.query(`DROP TABLE "autocare_guarantee_claims"`)
        await queryRunner.query(`DROP TABLE "autocare_broadcast_offers"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_broadcast_requests_client"`)
        await queryRunner.query(`DROP TABLE "autocare_broadcast_requests"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_repair_events_request"`)
        await queryRunner.query(`DROP TABLE "autocare_repair_events"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_trust_evidence_lookup"`)
        await queryRunner.query(`DROP TABLE "autocare_trust_evidence"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_price_benchmarks_lookup"`)
        await queryRunner.query(`DROP TABLE "autocare_price_benchmarks"`)
        await queryRunner.query(`ALTER TABLE "autocare_reviews" DROP COLUMN "verifiedVisit"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "etaMinutes"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "dispatchBasePriceMinor"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "coverageRadiusKm"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "supportsPickup"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "supportsMobile"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "trustReassessedAt"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "trustBadge"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "trustScore"`)
    }
}
