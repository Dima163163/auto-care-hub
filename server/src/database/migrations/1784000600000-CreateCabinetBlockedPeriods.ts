import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCabinetBlockedPeriods1784000600000 implements MigrationInterface {
    name = 'CreateCabinetBlockedPeriods1784000600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."cabinet_blocked_period_kind" AS ENUM('blocked', 'holiday')`)
        await queryRunner.query(`CREATE TABLE "cabinet_blocked_periods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cabinetId" uuid NOT NULL, "date" date NOT NULL, "startTime" TIME, "endTime" TIME, "kind" "public"."cabinet_blocked_period_kind" NOT NULL DEFAULT 'blocked', "reason" text, CONSTRAINT "CHK_cabinet_blocked_period_time_range" CHECK (("startTime" IS NULL AND "endTime" IS NULL) OR ("startTime" IS NOT NULL AND "endTime" IS NOT NULL AND "startTime" < "endTime")), CONSTRAINT "PK_cabinet_blocked_periods" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE INDEX "IDX_cabinet_blocked_period_date" ON "cabinet_blocked_periods" ("cabinetId", "date")`)
        await queryRunner.query(`ALTER TABLE "cabinet_blocked_periods" ADD CONSTRAINT "FK_cabinet_blocked_period_cabinet" FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id") ON DELETE CASCADE`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "cabinet_blocked_periods"`)
        await queryRunner.query(`DROP TYPE "public"."cabinet_blocked_period_kind"`)
    }
}
