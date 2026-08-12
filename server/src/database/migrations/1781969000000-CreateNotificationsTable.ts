import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateNotificationsTable1781969000000 implements MigrationInterface {
    name = 'CreateNotificationsTable1781969000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_category') THEN CREATE TYPE "public"."notification_category" AS ENUM('booking', 'moderation', 'subscription', 'account'); END IF; END $$;`)
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "category" "public"."notification_category" NOT NULL, "title" text NOT NULL, "message" text NOT NULL, "link" text, "metadata" jsonb NOT NULL DEFAULT '{}', "readAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_notifications_user') THEN ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_user_created" ON "notifications" ("userId", "createdAt")`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_user_read" ON "notifications" ("userId", "readAt")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_notifications_user_read"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_notifications_user_created"`)
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_user"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."notification_category"`)
    }
}
