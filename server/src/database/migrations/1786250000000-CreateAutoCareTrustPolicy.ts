import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareTrustPolicy1786250000000 implements MigrationInterface {
    name = 'CreateAutoCareTrustPolicy1786250000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "autocare_trust_policy" (
                "id" text NOT NULL,
                "policyVersion" text NOT NULL,
                "trustedMinimumRating" numeric(3,2) NOT NULL DEFAULT 4.2,
                "trustedMinimumReviews" integer NOT NULL DEFAULT 5,
                "trustedMinimumCompletedVisits" integer NOT NULL DEFAULT 10,
                "trustedMaxNoShowRate" numeric(4,3) NOT NULL DEFAULT 0.100,
                "trustedMaxComplaintRate" numeric(4,3) NOT NULL DEFAULT 0.100,
                "trustedMaxResponseTimeMinutes" integer NOT NULL DEFAULT 120,
                "reassessmentIntervalHours" integer NOT NULL DEFAULT 24,
                "rolloutEnabled" boolean NOT NULL DEFAULT true,
                "rolloutMarketIds" text[] NOT NULL DEFAULT '{}',
                "rolloutPercentage" integer NOT NULL DEFAULT 100,
                "updatedById" uuid,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_autocare_trust_policy_id" PRIMARY KEY ("id")
            )
        `)
        await queryRunner.query(`
            INSERT INTO "autocare_trust_policy" ("id", "policyVersion")
            VALUES ('default', 'autocare-trust-v1')
        `)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "autocare_trust_policy"')
    }
}
