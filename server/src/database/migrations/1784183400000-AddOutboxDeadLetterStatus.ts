import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOutboxDeadLetterStatus1784183400000 implements MigrationInterface {
    name = 'AddOutboxDeadLetterStatus1784183400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."outbox_event_status" ADD VALUE IF NOT EXISTS 'dead_letter'`,
        )
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not safely remove enum values in a reversible migration.
    }
}
