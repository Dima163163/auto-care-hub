import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAutoCareProviderOwner1785750000000 implements MigrationInterface {
    name = 'AddAutoCareProviderOwner1785750000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD "ownerId" uuid`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" ADD CONSTRAINT "FK_autocare_provider_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_provider_owner" ON "autocare_providers" ("ownerId", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_provider_owner"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP CONSTRAINT "FK_autocare_provider_owner"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers" DROP COLUMN "ownerId"`)
    }
}
