import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateFavoriteCabinets1784182000000 implements MigrationInterface {
    name = 'CreateFavoriteCabinets1784182000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "favorite_cabinets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "cabinetId" uuid NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_favorite_cabinets_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_favorite_cabinets_user_cabinet" UNIQUE ("userId", "cabinetId"),
                CONSTRAINT "FK_favorite_cabinets_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_favorite_cabinets_cabinet" FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id") ON DELETE CASCADE
            )
        `)
        await queryRunner.query(
            'CREATE INDEX "IDX_favorite_cabinets_user_created_at" ON "favorite_cabinets" ("userId", "createdAt")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_favorite_cabinets_user_created_at"')
        await queryRunner.query('DROP TABLE "favorite_cabinets"')
    }
}
