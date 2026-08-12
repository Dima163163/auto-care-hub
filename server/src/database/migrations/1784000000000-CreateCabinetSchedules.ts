import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCabinetSchedules1784000000000 implements MigrationInterface {
    name = 'CreateCabinetSchedules1784000000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cabinet_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cabinetId" uuid NOT NULL, "weekday" smallint NOT NULL, "openTime" TIME NOT NULL, "closeTime" TIME NOT NULL, "isOpen" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_cabinet_schedules" PRIMARY KEY ("id"), CONSTRAINT "UQ_cabinet_schedule_weekday" UNIQUE ("cabinetId", "weekday"))`)
        await queryRunner.query(`ALTER TABLE "cabinet_schedules" ADD CONSTRAINT "FK_cabinet_schedules_cabinet" FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cabinet_schedules" DROP CONSTRAINT "FK_cabinet_schedules_cabinet"`)
        await queryRunner.query(`DROP TABLE "cabinet_schedules"`)
    }
}
