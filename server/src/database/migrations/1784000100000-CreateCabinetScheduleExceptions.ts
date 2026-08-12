import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCabinetScheduleExceptions1784000100000 implements MigrationInterface {
    name = 'CreateCabinetScheduleExceptions1784000100000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cabinet_schedule_exceptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cabinetId" uuid NOT NULL, "date" date NOT NULL, "openTime" TIME, "closeTime" TIME, "isClosed" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_cabinet_schedule_exceptions" PRIMARY KEY ("id"), CONSTRAINT "UQ_cabinet_schedule_exception_date" UNIQUE ("cabinetId", "date"))`)
        await queryRunner.query(`ALTER TABLE "cabinet_schedule_exceptions" ADD CONSTRAINT "FK_cabinet_schedule_exceptions_cabinet" FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cabinet_schedule_exceptions" DROP CONSTRAINT "FK_cabinet_schedule_exceptions_cabinet"`)
        await queryRunner.query(`DROP TABLE "cabinet_schedule_exceptions"`)
    }
}
