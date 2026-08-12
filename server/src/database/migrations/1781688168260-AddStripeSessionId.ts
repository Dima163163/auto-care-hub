import type { MigrationInterface, QueryRunner } from "typeorm"

export class AddStripeSessionId1781688168260 implements MigrationInterface {
    name = 'AddStripeSessionId1781688168260'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "stripeSessionId" text`)
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4420bea240584c97c872ac5eb4" ON "subscriptions" ("stripeSessionId") WHERE "stripeSessionId" IS NOT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_4420bea240584c97c872ac5eb4"`)
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "stripeSessionId"`)
    }

}
