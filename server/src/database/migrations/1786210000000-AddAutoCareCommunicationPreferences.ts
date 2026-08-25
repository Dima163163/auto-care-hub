import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Communication preferences keep small service teams from being forced into
 * an inbox workflow they cannot reliably staff. The defaults preserve the
 * current online experience for existing providers.
 */
export class AddAutoCareCommunicationPreferences1786210000000 implements MigrationInterface {
    name = 'AddAutoCareCommunicationPreferences1786210000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers"
            ADD "teamSize" text NOT NULL DEFAULT 'small_team',
            ADD "businessType" text NOT NULL DEFAULT 'company',
            ADD "chatEnabled" boolean NOT NULL DEFAULT true,
            ADD "communicationMode" text NOT NULL DEFAULT 'online',
            ADD "responseWindowMinutes" integer DEFAULT 240,
            ADD "responseHours" text NOT NULL DEFAULT 'working_hours',
            ADD "phoneBookingEnabled" boolean NOT NULL DEFAULT true,
            ADD "callbackEnabled" boolean NOT NULL DEFAULT true,
            ADD "requestPhotosEnabled" boolean NOT NULL DEFAULT true,
            ADD "publicContactNote" text`)
        await queryRunner.query(`ALTER TABLE "autocare_providers"
            ADD CONSTRAINT "CHK_autocare_provider_team_size" CHECK ("teamSize" IN ('solo', 'small_team', 'team', 'enterprise')),
            ADD CONSTRAINT "CHK_autocare_provider_business_type" CHECK ("businessType" IN ('sole_proprietor', 'self_employed', 'company', 'private_master', 'other')),
            ADD CONSTRAINT "CHK_autocare_provider_communication_mode" CHECK ("communicationMode" IN ('online', 'request_then_confirm', 'phone_only')),
            ADD CONSTRAINT "CHK_autocare_provider_response_window" CHECK ("responseWindowMinutes" IS NULL OR "responseWindowMinutes" BETWEEN 15 AND 10080),
            ADD CONSTRAINT "CHK_autocare_provider_response_hours" CHECK ("responseHours" IN ('working_hours', 'always_on'))`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_providers"
            DROP CONSTRAINT "CHK_autocare_provider_response_hours",
            DROP CONSTRAINT "CHK_autocare_provider_response_window",
            DROP CONSTRAINT "CHK_autocare_provider_communication_mode",
            DROP CONSTRAINT "CHK_autocare_provider_business_type",
            DROP CONSTRAINT "CHK_autocare_provider_team_size"`)
        await queryRunner.query(`ALTER TABLE "autocare_providers"
            DROP COLUMN "publicContactNote",
            DROP COLUMN "requestPhotosEnabled",
            DROP COLUMN "callbackEnabled",
            DROP COLUMN "phoneBookingEnabled",
            DROP COLUMN "responseHours",
            DROP COLUMN "responseWindowMinutes",
            DROP COLUMN "communicationMode",
            DROP COLUMN "chatEnabled",
            DROP COLUMN "businessType",
            DROP COLUMN "teamSize"`)
    }
}
