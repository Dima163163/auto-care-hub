import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCabinetImageManifests1785610000000 implements MigrationInterface {
    name = 'CreateCabinetImageManifests1785610000000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "cabinet_image_manifests" (
                "original_key" text NOT NULL,
                "version" text NOT NULL,
                "manifest" jsonb NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cabinet_image_manifests_original_key" PRIMARY KEY ("original_key"),
                CONSTRAINT "CHK_cabinet_image_manifests_original_key" CHECK ("original_key" ~ '^[a-f0-9-]+\\.(jpg|png|webp)$'),
                CONSTRAINT "CHK_cabinet_image_manifests_version" CHECK (char_length("version") BETWEEN 1 AND 128),
                CONSTRAINT "CHK_cabinet_image_manifests_manifest_object" CHECK (jsonb_typeof("manifest") = 'object')
            )
        `)
        await queryRunner.query(
            'CREATE INDEX IF NOT EXISTS "IDX_cabinet_image_manifests_updated_at" ON "cabinet_image_manifests" ("updated_at", "original_key")',
        )
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX IF EXISTS "public"."IDX_cabinet_image_manifests_updated_at"')
        await queryRunner.query('DROP TABLE IF EXISTS "cabinet_image_manifests"')
    }
}
