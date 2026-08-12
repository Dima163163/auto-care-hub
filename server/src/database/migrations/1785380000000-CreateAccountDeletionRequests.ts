import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAccountDeletionRequests1785380000000
    implements MigrationInterface
{
    name = 'CreateAccountDeletionRequests1785380000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "account_deletion_request_status" AS ENUM('pending', 'cancelled', 'completed')`,
        )
        await queryRunner.query(
            `CREATE TABLE "account_deletion_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "status" "account_deletion_request_status" NOT NULL DEFAULT 'pending',
                "reason" text,
                "cancelled_at" TIMESTAMP WITH TIME ZONE,
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_account_deletion_requests" PRIMARY KEY ("id"),
                CONSTRAINT "FK_account_deletion_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )`,
        )
        await queryRunner.query(
            `CREATE INDEX "IDX_account_deletion_requests_user_status" ON "account_deletion_requests" ("user_id", "status")`,
        )
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_account_deletion_requests_pending_user" ON "account_deletion_requests" ("user_id") WHERE "status" = 'pending'`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX "public"."UQ_account_deletion_requests_pending_user"`,
        )
        await queryRunner.query(
            `DROP INDEX "public"."IDX_account_deletion_requests_user_status"`,
        )
        await queryRunner.query(
            `DROP TABLE "account_deletion_requests"`,
        )
        await queryRunner.query(
            `DROP TYPE "account_deletion_request_status"`,
        )
    }
}
