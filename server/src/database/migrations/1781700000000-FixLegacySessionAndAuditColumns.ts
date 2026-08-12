import type { MigrationInterface, QueryRunner } from 'typeorm'

export class FixLegacySessionAndAuditColumns1781700000000 implements MigrationInterface {
    name = 'FixLegacySessionAndAuditColumns1781700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF to_regclass('public.user_sessions') IS NOT NULL THEN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'user_agent'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'userAgent'
                    ) THEN
                        ALTER TABLE "user_sessions"
                            RENAME COLUMN "user_agent" TO "userAgent";
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'ip_address'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'ipAddress'
                    ) THEN
                        ALTER TABLE "user_sessions"
                            RENAME COLUMN "ip_address" TO "ipAddress";
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'last_active_at'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'lastActiveAt'
                    ) THEN
                        ALTER TABLE "user_sessions"
                            RENAME COLUMN "last_active_at" TO "lastActiveAt";
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'expires_at'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'expiresAt'
                    ) THEN
                        ALTER TABLE "user_sessions"
                            RENAME COLUMN "expires_at" TO "expiresAt";
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'created_at'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'user_sessions'
                          AND column_name = 'createdAt'
                    ) THEN
                        ALTER TABLE "user_sessions"
                            RENAME COLUMN "created_at" TO "createdAt";
                    END IF;
                END IF;

                IF to_regclass('public.audit_logs') IS NOT NULL THEN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'audit_logs'
                          AND column_name = 'created_at'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'audit_logs'
                          AND column_name = 'createdAt'
                    ) THEN
                        ALTER TABLE "audit_logs"
                            RENAME COLUMN "created_at" TO "createdAt";
                    END IF;
                END IF;
            END $$;
        `)
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // Intentionally irreversible: this migration normalizes legacy manual
        // SQL column names to the TypeORM entity contract used by the app.
    }
}
