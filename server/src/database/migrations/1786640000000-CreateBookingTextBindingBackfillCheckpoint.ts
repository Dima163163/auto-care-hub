import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateBookingTextBindingBackfillCheckpoint1786640000000 implements MigrationInterface {
    name = 'CreateBookingTextBindingBackfillCheckpoint1786640000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "bookings" ADD "commentBinding" text, ADD "cancellationReasonBinding" text, ADD "ownerNoteBinding" text')
        await queryRunner.query(`CREATE TABLE "booking_text_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "booking_text_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "commentBinding", DROP COLUMN "cancellationReasonBinding", DROP COLUMN "ownerNoteBinding"')
    }
}
