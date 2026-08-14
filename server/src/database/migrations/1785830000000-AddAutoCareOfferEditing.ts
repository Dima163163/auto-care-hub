import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareOfferEditing1785830000000 implements MigrationInterface {
    name = 'AddAutoCareOfferEditing1785830000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_offerings" ADD "description" text`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "offeringSnapshot" jsonb`)
        await queryRunner.query(`
            UPDATE "autocare_service_requests" AS request
            SET "offeringSnapshot" = jsonb_build_object(
                'serviceSlug', definition."slug",
                'serviceLabels', definition."labels",
                'description', offering."description",
                'priceFromMinor', offering."priceFromMinor",
                'priceToMinor', offering."priceToMinor",
                'currencyCode', offering."currencyCode",
                'durationMinutes', offering."durationMinutes",
                'inclusions', offering."inclusions",
                'warrantyText', offering."warrantyText",
                'priceType', definition."priceType"
            )
            FROM "autocare_service_offerings" AS offering
            JOIN "autocare_service_definitions" AS definition ON definition."id" = offering."definitionId"
            WHERE request."offeringId" = offering."id"
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "offeringSnapshot"`)
        await queryRunner.query(`ALTER TABLE "autocare_service_offerings" DROP COLUMN "description"`)
    }
}
