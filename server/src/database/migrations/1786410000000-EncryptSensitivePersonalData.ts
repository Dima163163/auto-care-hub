import type { MigrationInterface, QueryRunner } from 'typeorm'
import {
    createEmailBlindIndex,
    createBlindIndex,
    decryptFieldValue,
    encryptFieldValue,
    isEncryptedFieldEnvelope,
    outboxPayloadEncryptionTransformer,
    storageEnvelope,
} from '../../shared/security/data-encryption/field-encryption.js'

type Field = { table: string; column: string; type: 'text' | 'jsonb' }
type Row = Record<string, unknown> & { id: string }

const ENCRYPTED_FIELDS: readonly Field[] = [
    { table: 'users', column: 'name', type: 'text' },
    { table: 'users', column: 'phone', type: 'text' },
    { table: 'users', column: 'avatarUrl', type: 'text' },
    { table: 'users', column: 'communityDisplayName', type: 'text' },
    { table: 'users', column: 'preferredCity', type: 'text' },
    { table: 'client_vehicles', column: 'vin', type: 'text' },
    { table: 'client_vehicles', column: 'licensePlate', type: 'text' },
    { table: 'client_vehicles', column: 'internalNumber', type: 'text' },
    { table: 'client_vehicles', column: 'imageUrl', type: 'text' },
    { table: 'bookings', column: 'comment', type: 'text' },
    { table: 'bookings', column: 'cancellationReason', type: 'text' },
    { table: 'bookings', column: 'ownerNote', type: 'text' },
    { table: 'booking_reschedule_requests', column: 'resolutionReason', type: 'text' },
    { table: 'booking_status_history', column: 'reason', type: 'text' },
    { table: 'autocare_chat_threads', column: 'subject', type: 'text' },
    { table: 'autocare_service_requests', column: 'vehicleSnapshot', type: 'jsonb' },
    { table: 'autocare_service_requests', column: 'contactSnapshot', type: 'jsonb' },
    { table: 'autocare_service_requests', column: 'note', type: 'text' },
    { table: 'autocare_service_requests', column: 'estimateSnapshot', type: 'jsonb' },
    { table: 'autocare_service_requests', column: 'acceptedQuoteSnapshot', type: 'jsonb' },
    { table: 'autocare_service_requests', column: 'bookingSnapshot', type: 'jsonb' },
    { table: 'autocare_service_requests', column: 'cancellationReason', type: 'text' },
    { table: 'autocare_service_requests', column: 'noShowReason', type: 'text' },
    { table: 'autocare_service_requests', column: 'completionNote', type: 'text' },
    { table: 'autocare_service_messages', column: 'body', type: 'text' },
    { table: 'autocare_service_messages', column: 'offer', type: 'jsonb' },
    { table: 'autocare_chat_reports', column: 'description', type: 'text' },
    { table: 'autocare_chat_reports', column: 'resolutionReason', type: 'text' },
    { table: 'autocare_chat_reports', column: 'assignmentReason', type: 'text' },
    { table: 'autocare_chat_reports', column: 'extensionReason', type: 'text' },
    { table: 'autocare_chat_blocks', column: 'reason', type: 'text' },
    { table: 'autocare_appeals', column: 'reason', type: 'text' },
    { table: 'autocare_appeals', column: 'decisionReason', type: 'text' },
    { table: 'autocare_reschedule_requests', column: 'reason', type: 'text' },
    { table: 'autocare_reschedule_requests', column: 'resolutionReason', type: 'text' },
    { table: 'autocare_service_quotes', column: 'snapshot', type: 'jsonb' },
    { table: 'autocare_trust_evidence', column: 'notes', type: 'text' },
    { table: 'autocare_trust_evidence', column: 'reference', type: 'text' },
    { table: 'autocare_repair_events', column: 'title', type: 'text' },
    { table: 'autocare_repair_events', column: 'notes', type: 'text' },
    { table: 'autocare_repair_events', column: 'metadata', type: 'jsonb' },
    { table: 'autocare_broadcast_requests', column: 'issueDescription', type: 'text' },
    { table: 'autocare_broadcast_requests', column: 'vehicleSnapshot', type: 'jsonb' },
    { table: 'autocare_broadcast_offers', column: 'offerSnapshot', type: 'jsonb' },
    { table: 'autocare_guarantee_claims', column: 'summary', type: 'text' },
    { table: 'autocare_guarantee_claims', column: 'resolution', type: 'text' },
    { table: 'autocare_expert_questions', column: 'vehicleSnapshot', type: 'jsonb' },
    { table: 'autocare_expert_questions', column: 'symptoms', type: 'text' },
    { table: 'autocare_expert_questions', column: 'answer', type: 'text' },
    { table: 'autocare_fleet_accounts', column: 'name', type: 'text' },
    { table: 'autocare_fleet_accounts', column: 'notes', type: 'text' },
    { table: 'autocare_fleet_vehicles', column: 'label', type: 'text' },
    { table: 'autocare_fleet_vehicles', column: 'vehicleSnapshot', type: 'jsonb' },
    { table: 'autocare_provider_change_requests', column: 'payload', type: 'jsonb' },
    { table: 'autocare_provider_change_requests', column: 'reviewReason', type: 'text' },
    { table: 'autocare_catalog_gap_requests', column: 'labels', type: 'jsonb' },
    { table: 'autocare_catalog_gap_requests', column: 'comparisonAttributes', type: 'jsonb' },
    { table: 'autocare_catalog_gap_requests', column: 'rationale', type: 'text' },
    { table: 'autocare_catalog_gap_requests', column: 'reviewReason', type: 'text' },
]

const CONSTRAINTS_TO_DROP: readonly [string, string][] = [
    ['users', 'CHK_users_input_bounds'],
    ['users', 'CHK_users_community_display_name'],
    ['client_vehicles', 'CHK_client_vehicles_vin'],
    ['autocare_service_requests', 'CHK_autocare_service_requests_note'],
    ['autocare_service_messages', 'CHK_autocare_service_messages_body'],
    ['autocare_chat_reports', 'CHK_autocare_chat_reports_description'],
    ['autocare_chat_reports', 'CHK_autocare_chat_reports_reason'],
    ['autocare_chat_reports', 'CHK_autocare_chat_reports_assignment_reason'],
    ['autocare_chat_reports', 'CHK_autocare_chat_reports_extension_reason'],
    ['autocare_provider_invitations', 'CHK_autocare_provider_invitations_email'],
]

async function transformColumn(queryRunner: QueryRunner, field: Field, direction: 'encrypt' | 'decrypt') {
    const rows = await queryRunner.query(`SELECT "id", "${field.column}" AS "value" FROM "${field.table}" WHERE "${field.column}" IS NOT NULL`) as Row[]
    for (const row of rows) {
        const current = row.value
        if (direction === 'encrypt') {
            if (isEncryptedFieldEnvelope(current)) continue
            const envelope = encryptFieldValue(field.table, field.column, field.type === 'text' ? current : current)
            await queryRunner.query(`UPDATE "${field.table}" SET "${field.column}" = $1 WHERE "id" = $2`, [storageEnvelope(envelope, field.type), row.id])
        } else {
            const plaintext = decryptFieldValue(field.table, field.column, current)
            await queryRunner.query(`UPDATE "${field.table}" SET "${field.column}" = $1 WHERE "id" = $2`, [field.type === 'text' ? plaintext : JSON.stringify(plaintext), row.id])
        }
    }
}

function asString(value: unknown) {
    if (typeof value !== 'string') throw new Error('Sensitive-data migration encountered an invalid identity value.')
    return value
}

export class EncryptSensitivePersonalData1786410000000 implements MigrationInterface {
    name = 'EncryptSensitivePersonalData1786410000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "emailCiphertext" text`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_invitations" ADD COLUMN "emailCiphertext" text`)
        await queryRunner.query(`ALTER TABLE "oauth_identities" ADD COLUMN "provider_subject_ciphertext" text`)
        for (const [table, constraint] of CONSTRAINTS_TO_DROP) {
            await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`)
        }

        const users = await queryRunner.query(`SELECT "id", "email" FROM "users" ORDER BY "id"`) as Array<{ id: string; email: unknown }>
        const uniqueIndexes = new Map<string, string>()
        for (const user of users) {
            const email = asString(user.email)
            const index = createEmailBlindIndex(email)
            if (uniqueIndexes.has(index)) throw new Error('Email blind-index migration stopped because duplicate normalized user addresses exist.')
            uniqueIndexes.set(index, user.id)
        }
        for (const user of users) {
            const email = asString(user.email)
            const encrypted = JSON.stringify(encryptFieldValue('users', 'email', email))
            await queryRunner.query(`UPDATE "users" SET "email" = $1, "emailCiphertext" = $2 WHERE "id" = $3`, [createEmailBlindIndex(email), encrypted, user.id])
        }
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "emailCiphertext" SET NOT NULL`)

        const invitations = await queryRunner.query(`SELECT "id", "email", "providerId", "status", "role", "locationId" FROM "autocare_provider_invitations" ORDER BY "id"`) as Array<{ id: string; email: unknown; providerId: string; status: string; role: string; locationId: string | null }>
        const pendingInviteKeys = new Set<string>()
        for (const invitation of invitations) {
            const email = asString(invitation.email)
            if (invitation.status === 'pending') {
                const key = `${invitation.providerId}:${createEmailBlindIndex(email)}:${invitation.role}:${invitation.locationId ?? '00000000-0000-0000-0000-000000000000'}`
                if (pendingInviteKeys.has(key)) throw new Error('Email blind-index migration stopped because duplicate pending invitations exist.')
                pendingInviteKeys.add(key)
            }
        }
        for (const invitation of invitations) {
            const email = asString(invitation.email)
            const encrypted = JSON.stringify(encryptFieldValue('autocare_provider_invitations', 'email', email))
            await queryRunner.query(`UPDATE "autocare_provider_invitations" SET "email" = $1, "emailCiphertext" = $2 WHERE "id" = $3`, [createEmailBlindIndex(email), encrypted, invitation.id])
        }
        await queryRunner.query(`ALTER TABLE "autocare_provider_invitations" ALTER COLUMN "emailCiphertext" SET NOT NULL`)

        const oauthIdentities = await queryRunner.query(`SELECT "id", "provider_subject" FROM "oauth_identities" ORDER BY "id"`) as Array<{ id: string; provider_subject: unknown }>
        for (const identity of oauthIdentities) {
            const subject = asString(identity.provider_subject)
            const encrypted = JSON.stringify(encryptFieldValue('oauth_identities', 'providerSubject', subject))
            await queryRunner.query(`UPDATE "oauth_identities" SET "provider_subject" = $1, "provider_subject_ciphertext" = $2 WHERE "id" = $3`, [createBlindIndex(subject, 'oauth-provider-subject'), encrypted, identity.id])
        }
        await queryRunner.query(`ALTER TABLE "oauth_identities" ALTER COLUMN "provider_subject_ciphertext" SET NOT NULL`)

        for (const field of ENCRYPTED_FIELDS) await transformColumn(queryRunner, field, 'encrypt')

        await queryRunner.query(`ALTER TABLE "autocare_repair_events" ALTER COLUMN "metadata" DROP DEFAULT`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_change_requests" ALTER COLUMN "payload" DROP DEFAULT`)
        await queryRunner.query(`ALTER TABLE "autocare_catalog_gap_requests" ALTER COLUMN "labels" DROP DEFAULT`)
        await queryRunner.query(`ALTER TABLE "autocare_catalog_gap_requests" ALTER COLUMN "comparisonAttributes" DROP DEFAULT`)

        const outboxEvents = await queryRunner.query(`SELECT "id", "payload" FROM "outbox_events" ORDER BY "id"`) as Array<{ id: string; payload: Record<string, unknown> }>
        for (const event of outboxEvents) {
            const payload = outboxPayloadEncryptionTransformer.to(event.payload)
            await queryRunner.query(`UPDATE "outbox_events" SET "payload" = $1 WHERE "id" = $2`, [JSON.stringify(payload), event.id])
        }
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "CHK_reviews_input_bounds"`)
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "CHK_reviews_input_bounds" CHECK ("rating" BETWEEN 1 AND 5 AND char_length("text") BETWEEN 10 AND 1000)`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const outboxEvents = await queryRunner.query(`SELECT "id", "payload" FROM "outbox_events" ORDER BY "id"`) as Array<{ id: string; payload: Record<string, unknown> }>
        for (const event of outboxEvents) {
            const payload = outboxPayloadEncryptionTransformer.from(event.payload)
            await queryRunner.query(`UPDATE "outbox_events" SET "payload" = $1 WHERE "id" = $2`, [JSON.stringify(payload), event.id])
        }

        for (const field of [...ENCRYPTED_FIELDS].reverse()) await transformColumn(queryRunner, field, 'decrypt')

        const invitations = await queryRunner.query(`SELECT "id", "email", "emailCiphertext" FROM "autocare_provider_invitations"`) as Array<{ id: string; email: string; emailCiphertext: string }>
        for (const invitation of invitations) {
            const email = decryptFieldValue<string>('autocare_provider_invitations', 'email', invitation.emailCiphertext)
            await queryRunner.query(`UPDATE "autocare_provider_invitations" SET "email" = $1 WHERE "id" = $2`, [email, invitation.id])
        }
        const users = await queryRunner.query(`SELECT "id", "emailCiphertext" FROM "users"`) as Array<{ id: string; emailCiphertext: string }>
        for (const user of users) {
            const email = decryptFieldValue<string>('users', 'email', user.emailCiphertext)
            await queryRunner.query(`UPDATE "users" SET "email" = $1 WHERE "id" = $2`, [email, user.id])
        }
        await queryRunner.query(`ALTER TABLE "autocare_provider_invitations" DROP COLUMN "emailCiphertext"`)
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailCiphertext"`)
        const oauthIdentities = await queryRunner.query(`SELECT "id", "provider_subject_ciphertext" FROM "oauth_identities"`) as Array<{ id: string; provider_subject_ciphertext: string }>
        for (const identity of oauthIdentities) {
            const subject = decryptFieldValue<string>('oauth_identities', 'providerSubject', identity.provider_subject_ciphertext)
            await queryRunner.query(`UPDATE "oauth_identities" SET "provider_subject" = $1 WHERE "id" = $2`, [subject, identity.id])
        }
        await queryRunner.query(`ALTER TABLE "oauth_identities" DROP COLUMN "provider_subject_ciphertext"`)
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "CHK_users_input_bounds" CHECK (char_length("name") BETWEEN 2 AND 120 AND char_length("email") BETWEEN 3 AND 320 AND ("phone" IS NULL OR char_length("phone") <= 32) AND ("avatarUrl" IS NULL OR char_length("avatarUrl") <= 2048) AND ("preferredCity" IS NULL OR char_length("preferredCity") <= 120) AND cardinality("preferredCategories") <= 12)`)
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "CHK_users_community_display_name" CHECK ("communityDisplayName" IS NULL OR (char_length(btrim("communityDisplayName")) BETWEEN 2 AND 40 AND "communityDisplayName" !~ '[[:cntrl:]]'))`)
        await queryRunner.query(`ALTER TABLE "client_vehicles" ADD CONSTRAINT "CHK_client_vehicles_vin" CHECK ("vin" IS NULL OR char_length("vin") = 17)`)
        await queryRunner.query(`ALTER TABLE "autocare_service_requests" ADD CONSTRAINT "CHK_autocare_service_requests_note" CHECK ("note" IS NULL OR char_length("note") <= 4000)`)
        await queryRunner.query(`ALTER TABLE "autocare_service_messages" ADD CONSTRAINT "CHK_autocare_service_messages_body" CHECK ("body" IS NULL OR char_length("body") BETWEEN 1 AND 4000)`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_reports" ADD CONSTRAINT "CHK_autocare_chat_reports_description" CHECK ("description" IS NULL OR char_length("description") BETWEEN 1 AND 2000)`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_reports" ADD CONSTRAINT "CHK_autocare_chat_reports_reason" CHECK ("resolutionReason" IS NULL OR char_length("resolutionReason") BETWEEN 1 AND 2000)`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_reports" ADD CONSTRAINT "CHK_autocare_chat_reports_assignment_reason" CHECK ("assignmentReason" IS NULL OR char_length("assignmentReason") BETWEEN 1 AND 2000)`)
        await queryRunner.query(`ALTER TABLE "autocare_chat_reports" ADD CONSTRAINT "CHK_autocare_chat_reports_extension_reason" CHECK ("extensionReason" IS NULL OR char_length("extensionReason") BETWEEN 1 AND 2000)`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_invitations" ADD CONSTRAINT "CHK_autocare_provider_invitations_email" CHECK (char_length("email") BETWEEN 3 AND 320)`)
        await queryRunner.query(`ALTER TABLE "autocare_repair_events" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`)
        await queryRunner.query(`ALTER TABLE "autocare_provider_change_requests" ALTER COLUMN "payload" SET DEFAULT '{}'::jsonb`)
        await queryRunner.query(`ALTER TABLE "autocare_catalog_gap_requests" ALTER COLUMN "labels" SET DEFAULT '{}'::jsonb`)
        await queryRunner.query(`ALTER TABLE "autocare_catalog_gap_requests" ALTER COLUMN "comparisonAttributes" SET DEFAULT '[]'::jsonb`)
    }
}
