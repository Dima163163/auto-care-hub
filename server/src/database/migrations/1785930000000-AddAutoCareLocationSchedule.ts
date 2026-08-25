import type { MigrationInterface, QueryRunner } from 'typeorm'

const defaultSchedule = JSON.stringify(Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => [day, { open: '08:00', close: '21:00', closed: false }])))

export class AddAutoCareLocationSchedule1785930000000 implements MigrationInterface {
    name = 'AddAutoCareLocationSchedule1785930000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "timezone" text NOT NULL DEFAULT 'UTC'`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "weeklySchedule" jsonb NOT NULL DEFAULT '${defaultSchedule}'`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" ADD "blackoutDates" date[] NOT NULL DEFAULT '{}'`)
        await queryRunner.query(`UPDATE "autocare_service_locations" AS location SET "timezone" = market."timezone" FROM "autocare_markets" AS market WHERE market."id" = location."marketId"`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "blackoutDates"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "weeklySchedule"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_locations" DROP COLUMN "timezone"`)
    }
}
