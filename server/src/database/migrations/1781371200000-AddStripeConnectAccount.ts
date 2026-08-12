import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStripeConnectAccount1781371200000 implements MigrationInterface {
    name = 'AddStripeConnectAccount1781371200000'

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users" ADD "stripeConnectAccountId" text')
        await queryRunner.query('CREATE UNIQUE INDEX "IDX_users_stripe_connect_account" ON "users" ("stripeConnectAccountId") WHERE "stripeConnectAccountId" IS NOT NULL')
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_users_stripe_connect_account"')
        await queryRunner.query('ALTER TABLE "users" DROP COLUMN "stripeConnectAccountId"')
    }
}
