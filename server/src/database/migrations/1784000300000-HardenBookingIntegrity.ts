import type { MigrationInterface, QueryRunner } from 'typeorm'

export class HardenBookingIntegrity1784000300000 implements MigrationInterface {
    name = 'HardenBookingIntegrity1784000300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "btree_gist"')
        await queryRunner.query(`CREATE INDEX "IDX_bookings_cabinet_date_status" ON "bookings" ("cabinetId", "date", "status")`)
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "CHK_bookings_time_range" CHECK ("startTime" < "endTime")`)
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "EXCL_bookings_active_time_overlap" EXCLUDE USING gist ("cabinetId" WITH =, tsrange(("date" + "startTime"), ("date" + "endTime"), '[)') WITH &&) WHERE ("status" IN ('pending', 'confirmed'))`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "EXCL_bookings_active_time_overlap"`)
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "CHK_bookings_time_range"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_bookings_cabinet_date_status"`)
    }
}
