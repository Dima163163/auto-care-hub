import type { MigrationInterface, QueryRunner } from "typeorm"

export class SeedInitialUsers1781370793804 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 123456
        const passwordHash = '$2b$10$zBydeVWEbMjd30bBgnSzkeaAulDiBSJoGtDIfBxqOM5XotEeeKVW.'
        
        await queryRunner.query(`
            INSERT INTO users (name, email, "passwordHash", role, status, provider, "emailVerifiedAt")
            VALUES 
                ('Client User', 'client@example.com', '${passwordHash}', 'client', 'active', 'email', NOW()),
                ('Owner User', 'owner@example.com', '${passwordHash}', 'owner', 'active', 'email', NOW()),
                ('Super Admin', 'admin@example.com', '${passwordHash}', 'super_admin', 'active', 'email', NOW())
            ON CONFLICT (email) DO NOTHING
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM users WHERE email IN ('client@example.com', 'owner@example.com', 'admin@example.com')
        `)
    }

}
