import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateExpertQuestionBindingBackfillCheckpoint1786780000000 implements MigrationInterface {
    name = 'CreateExpertQuestionBindingBackfillCheckpoint1786780000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "autocare_expert_questions" ADD "vehicleSnapshotBinding" text, ADD "symptomsBinding" text, ADD "answerBinding" text')
        await queryRunner.query(`CREATE TABLE "expert_question_binding_backfill_checkpoints" (
            "name" text PRIMARY KEY,
            "afterId" uuid,
            "processed" bigint NOT NULL DEFAULT 0 CHECK ("processed" >= 0),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "expert_question_binding_backfill_checkpoints"')
        await queryRunner.query('ALTER TABLE "autocare_expert_questions" DROP COLUMN "vehicleSnapshotBinding", DROP COLUMN "symptomsBinding", DROP COLUMN "answerBinding"')
    }
}
