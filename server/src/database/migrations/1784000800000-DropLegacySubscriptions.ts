import type { MigrationInterface, QueryRunner } from 'typeorm'

export class DropLegacySubscriptions1784000800000 implements MigrationInterface {
    name = 'DropLegacySubscriptions1784000800000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS "subscriptions"')
        await queryRunner.query('DROP TYPE IF EXISTS "subscription_status"')
        await queryRunner.query('DROP TYPE IF EXISTS "subscription_plan"')
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TYPE \"subscription_plan\" AS ENUM ('trial', 'basic', 'premium', 'promo')")
        await queryRunner.query("CREATE TYPE \"subscription_status\" AS ENUM ('active', 'expired', 'cancelled')")
        await queryRunner.query(`CREATE TABLE "subscriptions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "plan" "subscription_plan" NOT NULL,
            "status" "subscription_status" NOT NULL DEFAULT 'active',
            "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "stripeSubscriptionId" character varying,
            "stripeSessionId" character varying,
            "stripeCustomerId" character varying,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
            CONSTRAINT "FK_subscriptions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )`)
    }
}
