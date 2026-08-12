import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAvailabilityCandidateIndex1785370000000 implements MigrationInterface {
    name = 'AddAvailabilityCandidateIndex1785370000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE INDEX "IDX_services_cabinet_active" ON "services" ("cabinetId", "isActive")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_services_cabinet_active"')
    }
}
