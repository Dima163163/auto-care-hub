import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSystemIncidents1784181000000 implements MigrationInterface {
    name = 'AddSystemIncidents1784181000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "CREATE TYPE \"system_incident_type\" AS ENUM('server_error', 'health_check', 'background_job', 'payment_webhook')",
        )
        await queryRunner.query(
            "CREATE TYPE \"system_incident_severity\" AS ENUM('warning', 'critical')",
        )
        await queryRunner.query(
            "CREATE TYPE \"system_incident_status\" AS ENUM('open', 'acknowledged', 'resolved')",
        )
        await queryRunner.query(`
            CREATE TABLE "system_incidents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" "system_incident_type" NOT NULL,
                "severity" "system_incident_severity" NOT NULL,
                "status" "system_incident_status" NOT NULL DEFAULT 'open',
                "title" text NOT NULL,
                "request_id" text,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "occurrence_count" integer NOT NULL DEFAULT 1,
                "first_occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "last_occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "acknowledged_at" TIMESTAMP WITH TIME ZONE,
                "resolved_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_system_incidents_id" PRIMARY KEY ("id")
            )
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_system_incidents_status_last_occurred_at" ON "system_incidents" ("status", "last_occurred_at")',
        )
        await queryRunner.query(
            'CREATE INDEX "IDX_system_incidents_request_id" ON "system_incidents" ("request_id")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_system_incidents_request_id"')
        await queryRunner.query('DROP INDEX "public"."IDX_system_incidents_status_last_occurred_at"')
        await queryRunner.query('DROP TABLE "system_incidents"')
        await queryRunner.query('DROP TYPE "system_incident_status"')
        await queryRunner.query('DROP TYPE "system_incident_severity"')
        await queryRunner.query('DROP TYPE "system_incident_type"')
    }
}
