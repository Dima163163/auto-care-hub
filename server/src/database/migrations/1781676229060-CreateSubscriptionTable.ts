import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateSubscriptionTable1781676229060 implements MigrationInterface {
    name = 'CreateSubscriptionTable1781676229060'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."subscription_plan" AS ENUM('trial', 'basic', 'premium', 'promo')`)
        await queryRunner.query(`CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'cancelled', 'past_due')`)
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "plan" "public"."subscription_plan" NOT NULL DEFAULT 'trial', "status" "public"."subscription_status" NOT NULL DEFAULT 'active', "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "stripeSubscriptionId" text, "stripeCustomerId" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE INDEX "IDX_fbdba4e2ac694cf8c9cecf4dc8" ON "subscriptions" ("userId") `)
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5ab3dbf5948a5ee2b8a8261ae0" ON "subscriptions" ("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL`)
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_5ab3dbf5948a5ee2b8a8261ae0"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_fbdba4e2ac694cf8c9cecf4dc8"`)
        await queryRunner.query(`DROP TABLE "subscriptions"`)
        await queryRunner.query(`DROP TYPE "public"."subscription_status"`)
        await queryRunner.query(`DROP TYPE "public"."subscription_plan"`)
    }

}
