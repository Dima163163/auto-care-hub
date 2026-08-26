import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Adds branch resources and auditable reservations without changing legacy slot capacity. */
export class CreateAutoCareCapacityResources1786230000000 implements MigrationInterface {
    name = 'CreateAutoCareCapacityResources1786230000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "autocare_capacity_resource_type" AS ENUM ('specialist', 'bay', 'lift', 'equipment')`)
        await queryRunner.query(`CREATE TYPE "autocare_capacity_reservation_status" AS ENUM ('active', 'released')`)
        await queryRunner.query(`ALTER TABLE "autocare_service_offerings" ADD "requiredResourceTypes" text[] NOT NULL DEFAULT '{}'`)
        await queryRunner.query(`ALTER TABLE "autocare_service_offerings" ADD "requiredResourceIds" uuid[] NOT NULL DEFAULT '{}'`)
        await queryRunner.query(`CREATE TABLE "autocare_capacity_resources" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providerId" uuid NOT NULL,
            "locationId" uuid NOT NULL,
            "type" "autocare_capacity_resource_type" NOT NULL,
            "name" text NOT NULL,
            "capacity" integer NOT NULL DEFAULT 1,
            "active" boolean NOT NULL DEFAULT true,
            "metadata" jsonb NOT NULL DEFAULT '{}',
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_capacity_resources_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_autocare_capacity_resources_provider_location_name" UNIQUE ("providerId", "locationId", "name"),
            CONSTRAINT "CHK_autocare_capacity_resources_capacity" CHECK ("capacity" BETWEEN 1 AND 100),
            CONSTRAINT "FK_autocare_capacity_resources_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_capacity_resources_location" FOREIGN KEY ("locationId") REFERENCES "autocare_service_locations"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_capacity_resources_location_active_type" ON "autocare_capacity_resources" ("locationId", "active", "type")`)
        await queryRunner.query(`CREATE TABLE "autocare_capacity_reservations" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "requestId" uuid NOT NULL,
            "resourceId" uuid NOT NULL,
            "providerId" uuid NOT NULL,
            "locationId" uuid NOT NULL,
            "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "status" "autocare_capacity_reservation_status" NOT NULL DEFAULT 'active',
            "releasedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_autocare_capacity_reservations_id" PRIMARY KEY ("id"),
            CONSTRAINT "CHK_autocare_capacity_reservations_range" CHECK ("endsAt" > "startsAt"),
            CONSTRAINT "FK_autocare_capacity_reservations_request" FOREIGN KEY ("requestId") REFERENCES "autocare_service_requests"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_capacity_reservations_resource" FOREIGN KEY ("resourceId") REFERENCES "autocare_capacity_resources"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_capacity_reservations_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_capacity_reservations_location" FOREIGN KEY ("locationId") REFERENCES "autocare_service_locations"("id") ON DELETE CASCADE
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_capacity_reservations_resource_status_range" ON "autocare_capacity_reservations" ("resourceId", "status", "startsAt", "endsAt")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_capacity_reservations_request_resource_active" ON "autocare_capacity_reservations" ("requestId", "resourceId") WHERE "status" = 'active'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX IF EXISTS "UQ_autocare_capacity_reservations_request_resource_active"')
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_autocare_capacity_reservations_resource_status_range"')
        await queryRunner.query('DROP TABLE IF EXISTS "autocare_capacity_reservations"')
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_autocare_capacity_resources_location_active_type"')
        await queryRunner.query('DROP TABLE IF EXISTS "autocare_capacity_resources"')
        await queryRunner.query('ALTER TABLE "autocare_service_offerings" DROP COLUMN IF EXISTS "requiredResourceIds"')
        await queryRunner.query('ALTER TABLE "autocare_service_offerings" DROP COLUMN IF EXISTS "requiredResourceTypes"')
        await queryRunner.query('DROP TYPE IF EXISTS "autocare_capacity_reservation_status"')
        await queryRunner.query('DROP TYPE IF EXISTS "autocare_capacity_resource_type"')
    }
}
