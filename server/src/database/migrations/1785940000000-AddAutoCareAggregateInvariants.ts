import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Keep independently stored ids from drifting across AutoCare aggregates.
 * Constraints are deliberately NOT VALID for the expand phase: existing
 * installations may contain legacy rows that must be repaired and validated
 * by the release runbook before the constraints are promoted.
 */
export class AddAutoCareAggregateInvariants1785940000000 implements MigrationInterface {
    name = 'AddAutoCareAggregateInvariants1785940000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_locations_id_provider" ON "autocare_service_locations" ("id", "providerId")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_offerings_id_location_definition" ON "autocare_service_offerings" ("id", "locationId", "definitionId")`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_requests_id_client_provider" ON "autocare_service_requests" ("id", "clientId", "providerId")`)

        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "FK_autocare_requests_provider_location" FOREIGN KEY ("locationId", "providerId") REFERENCES "autocare_service_locations" ("id", "providerId") ON DELETE RESTRICT NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "FK_autocare_requests_offering_context" FOREIGN KEY ("offeringId", "locationId", "definitionId") REFERENCES "autocare_service_offerings" ("id", "locationId", "definitionId") ON DELETE RESTRICT NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_broadcast_offers" ADD CONSTRAINT "FK_autocare_broadcast_offers_provider_location" FOREIGN KEY ("locationId", "providerId") REFERENCES "autocare_service_locations" ("id", "providerId") ON DELETE CASCADE NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_guarantee_claims" ADD CONSTRAINT "FK_autocare_guarantee_claims_request_context" FOREIGN KEY ("requestId", "clientId", "providerId") REFERENCES "autocare_service_requests" ("id", "clientId", "providerId") ON DELETE CASCADE NOT VALID`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_guarantee_claims" DROP CONSTRAINT "FK_autocare_guarantee_claims_request_context"`)
        await queryRunner.query(`ALTER TABLE "autocare_broadcast_offers" DROP CONSTRAINT "FK_autocare_broadcast_offers_provider_location"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "FK_autocare_requests_offering_context"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP CONSTRAINT "FK_autocare_requests_provider_location"`)
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_requests_id_client_provider"`)
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_offerings_id_location_definition"`)
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_locations_id_provider"`)
    }
}
