import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateClientVehicles1785810000000 implements MigrationInterface {
    name = 'CreateClientVehicles1785810000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "client_vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "brandId" text NOT NULL, "model" text NOT NULL, "year" integer NOT NULL, "fuelType" text NOT NULL, "engineDisplacement" numeric(3,1), "horsepower" integer, "color" text NOT NULL, "vin" text, "imageUrl" text NOT NULL, "isPrimary" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_client_vehicles_id" PRIMARY KEY ("id"), CONSTRAINT "CHK_client_vehicles_year" CHECK ("year" BETWEEN 1950 AND 2100), CONSTRAINT "CHK_client_vehicles_vin" CHECK ("vin" IS NULL OR char_length("vin") = 17), CONSTRAINT "FK_client_vehicles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE)`)
        await queryRunner.query(`CREATE INDEX "IDX_client_vehicles_user_created" ON "client_vehicles" ("userId", "createdAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_client_vehicles_user_created"`)
        await queryRunner.query(`DROP TABLE "client_vehicles"`)
    }
}
