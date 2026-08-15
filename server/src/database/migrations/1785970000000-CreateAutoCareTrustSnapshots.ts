import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareTrustSnapshots1785970000000 implements MigrationInterface {
    name = 'CreateAutoCareTrustSnapshots1785970000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "autocare_trust_snapshots" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "providerId" uuid NOT NULL,
            "locationId" uuid NOT NULL,
            "policyVersion" text NOT NULL,
            "score" numeric(5,2) NOT NULL,
            "badge" text,
            "computedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "validUntil" TIMESTAMP WITH TIME ZONE NOT NULL,
            "inputCounters" jsonb NOT NULL DEFAULT '{}',
            "reasonCodes" text[] NOT NULL DEFAULT '{}',
            CONSTRAINT "PK_autocare_trust_snapshots_id" PRIMARY KEY ("id"),
            CONSTRAINT "CHK_autocare_trust_snapshots_score" CHECK ("score" >= 0 AND "score" <= 100),
            CONSTRAINT "FK_autocare_trust_snapshots_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_autocare_trust_snapshots_location_provider" FOREIGN KEY ("locationId", "providerId") REFERENCES "autocare_service_locations"("id", "providerId") ON DELETE CASCADE NOT VALID
        )`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_trust_snapshots_location_computed" ON "autocare_trust_snapshots" ("locationId", "computedAt")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_trust_snapshots_provider_location_policy" ON "autocare_trust_snapshots" ("providerId", "locationId", "policyVersion", "computedAt")`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_trust_snapshots_provider_location_policy"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_trust_snapshots_location_computed"`)
        await queryRunner.query(`DROP TABLE "autocare_trust_snapshots"`)
    }
}
