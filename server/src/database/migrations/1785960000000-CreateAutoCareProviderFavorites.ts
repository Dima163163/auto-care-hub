import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAutoCareProviderFavorites1785960000000 implements MigrationInterface {
    name = 'CreateAutoCareProviderFavorites1785960000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "autocare_provider_favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "providerId" uuid NOT NULL, "locationId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_autocare_provider_favorites" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_autocare_provider_favorites_user_provider" ON "autocare_provider_favorites" ("userId", "providerId")`)
        await queryRunner.query(`CREATE INDEX "IDX_autocare_provider_favorites_user_created" ON "autocare_provider_favorites" ("userId", "createdAt")`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_favorites" ADD CONSTRAINT "FK_autocare_provider_favorites_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_favorites" ADD CONSTRAINT "FK_autocare_provider_favorites_provider" FOREIGN KEY ("providerId") REFERENCES "autocare_providers"("id") ON DELETE CASCADE NOT VALID`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_favorites" ADD CONSTRAINT "FK_autocare_provider_favorites_location" FOREIGN KEY ("locationId") REFERENCES "autocare_service_locations"("id") ON DELETE CASCADE NOT VALID`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_provider_favorites" DROP CONSTRAINT "FK_autocare_provider_favorites_location"`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_favorites" DROP CONSTRAINT "FK_autocare_provider_favorites_provider"`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_favorites" DROP CONSTRAINT "FK_autocare_provider_favorites_user"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_autocare_provider_favorites_user_created"`)
        await queryRunner.query(`DROP INDEX "public"."UQ_autocare_provider_favorites_user_provider"`)
        await queryRunner.query(`DROP TABLE "autocare_provider_favorites"`)
    }
}
