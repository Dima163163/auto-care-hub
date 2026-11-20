import type { MigrationInterface, QueryRunner } from 'typeorm'

import { createEmailBlindIndex } from '../../shared/security/data-encryption/field-encryption.js'

// SHA-256 fingerprint of the bcrypt value written by SeedInitialUsers.
const legacyHashFingerprint = '227e99dfa60450621df518e045de4a68524146b7c23bdeaa4725a975f198d36c'
const legacyOwnerEmail = 'owner@example.com'
const originalCabinets = [
    { title: 'Modern beauty cabinet', address: 'Tverskaya street, 10', photo: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250' },
    { title: 'Medical consultation room', address: 'Nevsky prospect, 25', photo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d' },
    { title: 'Consulting office', address: 'Lenina avenue, 8', photo: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72' },
    ...Array.from({ length: 20 }, (_, index) => {
        const number = index + 1
        return {
            title: `Professional Workspace ${number}`,
            address: `Business Avenue ${number}`,
            photo: `https://picsum.photos/seed/cabinet${number}a/800/600`,
        }
    }),
]

export class DisableLegacyDemoDefaults1786820000000 implements MigrationInterface {
    name = 'DisableLegacyDemoDefaults1786820000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const emails = ['client@example.com', legacyOwnerEmail, 'admin@example.com'].map(createEmailBlindIndex)
        await queryRunner.query(`
            WITH disabled AS (
                UPDATE "users"
                SET "status" = 'blocked', "passwordHash" = NULL, "tokenVersion" = "tokenVersion" + 1
                WHERE "email" = ANY($1::text[])
                  AND encode(sha256(convert_to("passwordHash", 'UTF8')), 'hex') = $2
                RETURNING "id"
            )
            UPDATE "user_sessions" AS session
            SET "revoked_at" = NOW(), "revocation_reason" = 'legacy_demo_credentials_disabled'
            FROM disabled
            WHERE session."user_id" = disabled."id" AND session."revoked_at" IS NULL
        `, [emails, legacyHashFingerprint])

        await queryRunner.query(`
            UPDATE "cabinets" AS cabinet
            SET "status" = 'blocked'
            FROM "users" AS owner,
                 jsonb_to_recordset($2::jsonb) AS fixture(title text, address text, photo text)
            WHERE owner."email" = $1
              AND cabinet."ownerId" = owner."id"
              AND cabinet."status" = 'active'
              AND cabinet."title" = fixture.title
              AND cabinet."address" = fixture.address
              AND fixture.photo = ANY(cabinet."photos")
        `, [createEmailBlindIndex(legacyOwnerEmail), JSON.stringify(originalCabinets)])
    }

    public async down(): Promise<void> {
        // Deliberately keep retired passwords, sessions and demo listings disabled.
    }
}
