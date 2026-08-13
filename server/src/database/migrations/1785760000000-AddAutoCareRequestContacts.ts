import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareRequestContacts1785760000000 implements MigrationInterface {
    name = 'AddAutoCareRequestContacts1785760000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD "contactSnapshot" jsonb`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" DROP COLUMN "contactSnapshot"`)
    }
}
