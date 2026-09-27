import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RetainChatEvidenceForAppeals1786380000000 implements MigrationInterface {
    name = 'RetainChatEvidenceForAppeals1786380000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD COLUMN "evidenceRetainUntil" TIMESTAMP WITH TIME ZONE`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" DROP COLUMN "evidenceRetainUntil"`)
    }
}
