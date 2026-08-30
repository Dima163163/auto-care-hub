import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { ANONYMIZED_REVIEW_TEXT } from './account-anonymization-policy.js'

type QueryExecutor = Pick<EntityManager, 'query'>

export type AccountDeletionInvariant = {
    name: string
    sql: string
}

export type AccountDeletionInvariantResult = AccountDeletionInvariant & {
    count: number
}

/**
 * Tables that retain a user reference must either be removed, have the
 * reference nulled, or have their private payload redacted during account
 * deletion. Keeping this list explicit makes schema additions fail the
 * retention check instead of silently introducing a new PII leak.
 */
export const AUTOCARE_DELETION_INVARIANTS: readonly AccountDeletionInvariant[] = [
    { name: 'owned providers are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_providers" WHERE "ownerId" = $1' },
    { name: 'legacy cabinets are blocked and images removed', sql: 'SELECT COUNT(*)::int AS count FROM "cabinets" WHERE "ownerId" = $1 AND ("status" <> \'blocked\' OR cardinality("photos") > 0)' },
    { name: 'provider memberships are removed', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_provider_memberships" WHERE "userId" = $1' },
    { name: 'provider invitations by user are removed', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_provider_invitations" WHERE "invitedById" = $1' },
    { name: 'provider favorites are removed', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_provider_favorites" WHERE "userId" = $1' },
    { name: 'trust evidence verifier references are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_trust_evidence" WHERE "verifiedById" = $1' },
    {
        name: 'account-related attachment metadata is removed',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_service_attachments" attachment
            LEFT JOIN "autocare_service_requests" request ON request."id" = attachment."requestId"
            LEFT JOIN "autocare_chat_threads" thread ON thread."id" = attachment."threadId"
            WHERE attachment."uploadedById" = $1
               OR request."clientId" = $1
               OR thread."clientId" = $1
               OR thread."createdById" = $1`,
    },
    { name: 'bonus accounts are removed', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_bonus_accounts" WHERE "clientId" = $1' },
    { name: 'bonus ledger entries are removed', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_bonus_ledger" WHERE "clientId" = $1' },
    { name: 'review promos are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_review_promos" WHERE "clientId" = $1 OR "redeemedById" = $1' },
    { name: 'AutoCare reviews are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_reviews" WHERE "clientId" = $1' },
    { name: 'platform reviews are detached', sql: 'SELECT COUNT(*)::int AS count FROM "platform_reviews" WHERE "clientId" = $1' },
    { name: 'platform review responders are detached', sql: 'SELECT COUNT(*)::int AS count FROM "platform_reviews" WHERE "respondedById" = $1' },
    { name: 'chat threads are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1' },
    { name: 'security events are detached', sql: 'SELECT COUNT(*)::int AS count FROM "security_events" WHERE "user_id" = $1' },
    { name: 'audit log actors are redacted', sql: 'SELECT COUNT(*)::int AS count FROM "audit_logs" WHERE "actor_id" = $1' },
    { name: 'trust policy editor references are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_trust_policy" WHERE "updatedById" = $1' },
    { name: 'bonus ledger actor references are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_bonus_ledger" WHERE "actorId" = $1' },
    { name: 'security event assignee references are detached', sql: 'SELECT COUNT(*)::int AS count FROM "security_event_actions" WHERE "assignee_id" = $1' },
    { name: 'service request actor references are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_service_requests" WHERE "cancelledById" = $1 OR "noShowById" = $1 OR "completedById" = $1' },
    { name: 'reviews are anonymized', sql: 'SELECT COUNT(*)::int AS count FROM "reviews" WHERE "clientId" = $1 AND "text" <> $2' },
    {
        name: 'service request private snapshots are redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "autocare_service_requests"
            WHERE "clientId" = $1
              AND ("contactSnapshot" IS NOT NULL OR "vehicleSnapshot" IS NOT NULL OR "note" IS NOT NULL
                OR "cancellationReason" IS NOT NULL OR "noShowReason" IS NOT NULL OR "completionNote" IS NOT NULL
                OR "cancelledById" = $1 OR "noShowById" = $1 OR "completedById" = $1)`,
    },
    {
        name: 'service quote snapshots are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_service_quotes" quote
            JOIN "autocare_service_requests" request ON request."id" = quote."requestId"
            WHERE request."clientId" = $1
              AND COALESCE(quote."snapshot" ->> 'redacted', 'false') <> 'true'`,
    },
    {
        name: 'broadcast requests are redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "autocare_broadcast_requests"
            WHERE "clientId" = $1
              AND ("issueDescription" <> $2 OR "vehicleSnapshot" IS NOT NULL OR cardinality("photoUrls") > 0)`,
    },
    {
        name: 'guarantee claims are redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "autocare_guarantee_claims"
            WHERE "clientId" = $1
              AND ("summary" <> $2 OR cardinality("evidenceUrls") > 0 OR "resolution" IS NOT NULL OR "resolvedById" = $1)`,
    },
    {
        name: 'expert questions are redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "autocare_expert_questions"
            WHERE "clientId" = $1
              AND ("symptoms" <> $2 OR "vehicleSnapshot" IS NOT NULL OR "answer" IS NOT NULL OR "answeredById" = $1)`,
    },
    {
        name: 'fleet notes and vehicles are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_fleet_accounts" fleet
            LEFT JOIN "autocare_fleet_vehicles" vehicle ON vehicle."fleetId" = fleet."id"
            WHERE fleet."ownerId" = $1
              AND (fleet."notes" IS NOT NULL OR vehicle."label" <> $2 OR vehicle."vehicleSnapshot" <> '{}'::jsonb OR vehicle."approvalPolicy" IS NOT NULL)`,
    },
    {
        name: 'account-related service message bodies and offers are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_service_messages" message
            LEFT JOIN "autocare_service_requests" request ON request."id" = message."requestId"
            LEFT JOIN "autocare_chat_threads" thread ON thread."id" = message."threadId"
            WHERE (message."senderId" = $1 OR request."clientId" = $1 OR thread."clientId" = $1 OR thread."createdById" = $1)
              AND (message."body" IS NOT NULL OR message."offer" IS NOT NULL)`,
    },
    { name: 'repair event payloads are redacted', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_repair_events" event JOIN "autocare_service_requests" request ON request."id" = event."requestId" WHERE request."clientId" = $1 AND (event."title" <> $2 OR event."notes" IS NOT NULL OR event."metadata" <> \'{}\'::jsonb)' },
    { name: 'repair event actor references are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_repair_events" WHERE "actorId" = $1' },
    { name: 'provider change reviewers are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_provider_change_requests" WHERE "reviewedById" = $1' },
    { name: 'provider change request payloads are redacted', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_provider_change_requests" WHERE "requestedById" = $1 AND ("payload" <> \'{"redacted": true}\'::jsonb OR "reviewedById" = $1 OR "reviewReason" IS NOT NULL)' },
    {
        name: 'catalog gap request payloads are redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "autocare_catalog_gap_requests"
            WHERE "requestedById" = $1
              AND ("labels" <> '{}'::jsonb OR "comparisonAttributes" <> '[]'::jsonb OR "rationale" <> $2 OR "reviewedById" = $1 OR "reviewReason" IS NOT NULL)`,
    },
    { name: 'catalog gap reviewers are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_catalog_gap_requests" WHERE "reviewedById" = $1' },
    { name: 'appeal evidence is redacted', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_appeals" WHERE "submittedById" = $1 AND ("reason" <> $2 OR cardinality("evidenceIds") > 0 OR "decidedById" = $1 OR "decisionReason" IS NOT NULL)' },
    { name: 'appeal deciders are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_appeals" WHERE "decidedById" = $1' },
    {
        name: 'AutoCare reschedule references are detached',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_reschedule_requests" reschedule
            LEFT JOIN "autocare_service_requests" request ON request."id" = reschedule."requestId"
            WHERE (reschedule."requestedById" = $1 OR reschedule."resolvedById" = $1 OR request."clientId" = $1)
              AND (reschedule."reason" IS NOT NULL OR reschedule."resolvedById" = $1 OR reschedule."resolutionReason" IS NOT NULL)`,
    },
    {
        name: 'legacy booking status references are detached',
        sql: `SELECT COUNT(*)::int AS count
            FROM "booking_status_history" history
            LEFT JOIN "bookings" booking ON booking."id" = history."bookingId"
            WHERE history."changedById" = $1
               OR (booking."clientId" = $1 AND history."reason" IS NOT NULL)`,
    },
    {
        name: 'legacy booking free text is redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "bookings"
            WHERE "clientId" = $1
              AND ("comment" IS NOT NULL OR "cancellationReason" IS NOT NULL OR "ownerNote" IS NOT NULL)`,
    },
    {
        name: 'legacy booking reschedule references are detached',
        sql: `SELECT COUNT(*)::int AS count
            FROM "booking_reschedule_requests" reschedule
            LEFT JOIN "bookings" booking ON booking."id" = reschedule."bookingId"
            WHERE (reschedule."requestedById" = $1 OR reschedule."resolvedById" = $1 OR booking."clientId" = $1)
              AND (reschedule."resolvedById" = $1 OR reschedule."resolutionReason" IS NOT NULL)`,
    },
    {
        name: 'account-related chat report descriptions are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_chat_reports" report
            LEFT JOIN "autocare_chat_threads" thread ON thread."id" = report."threadId"
            WHERE (report."reporterId" = $1 OR report."reportedUserId" = $1 OR thread."clientId" = $1 OR thread."createdById" = $1)
              AND (report."description" IS NOT NULL OR report."reportedUserId" = $1 OR report."reviewedById" = $1 OR report."resolutionReason" IS NOT NULL)`,
    },
    { name: 'chat report reviewers are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_chat_reports" WHERE "reviewedById" = $1' },
    {
        name: 'account-related chat block reasons are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_chat_blocks" block
            LEFT JOIN "autocare_chat_threads" thread ON thread."id" = block."threadId"
            WHERE (block."blockerId" = $1 OR block."blockedUserId" = $1 OR thread."clientId" = $1 OR thread."createdById" = $1)
              AND block."reason" IS NOT NULL`,
    },
    { name: 'guarantee claim resolvers are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_guarantee_claims" WHERE "resolvedById" = $1' },
    { name: 'expert question answerers are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_expert_questions" WHERE "answeredById" = $1' },
    {
        name: 'anonymized chat attachment metadata is removed',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_service_attachments" attachment
            JOIN "autocare_chat_threads" thread ON thread."id" = attachment."threadId"
            WHERE thread."subject" = $2`,
    },
    {
        name: 'anonymized chat message payloads are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_service_messages" message
            JOIN "autocare_chat_threads" thread ON thread."id" = message."threadId"
            WHERE thread."subject" = $2
              AND (message."body" IS NOT NULL OR message."offer" IS NOT NULL)`,
    },
    {
        name: 'anonymized chat report payloads are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_chat_reports" report
            JOIN "autocare_chat_threads" thread ON thread."id" = report."threadId"
            WHERE thread."subject" = $2
              AND (report."description" IS NOT NULL OR report."reportedUserId" IS NOT NULL OR report."reviewedById" IS NOT NULL OR report."resolutionReason" IS NOT NULL)`,
    },
    {
        name: 'anonymized chat block reasons are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_chat_blocks" block
            JOIN "autocare_chat_threads" thread ON thread."id" = block."threadId"
            WHERE thread."subject" = $2
              AND block."reason" IS NOT NULL`,
    },
]

function getCount(row: unknown) {
    if (!row || typeof row !== 'object' || !('count' in row)) return 0
    const count = Number((row as { count: number | string }).count)
    return Number.isFinite(count) ? count : 0
}

export async function checkAutoCareDeletionInvariants(
    executor: QueryExecutor = AppDataSource,
    userId: string,
): Promise<AccountDeletionInvariantResult[]> {
    const results: AccountDeletionInvariantResult[] = []
    for (const invariant of AUTOCARE_DELETION_INVARIANTS) {
        const parameters = invariant.sql.includes('$2')
            ? [userId, ANONYMIZED_REVIEW_TEXT]
            : [userId]
        const rows = await executor.query(invariant.sql, parameters) as unknown[]
        results.push({ ...invariant, count: getCount(rows[0]) })
    }
    return results
}

export async function assertAutoCareDeletionInvariants(
    executor: QueryExecutor,
    userId: string,
) {
    const failures = (await checkAutoCareDeletionInvariants(executor, userId))
        .filter(({ count }) => count > 0)
    if (failures.length > 0) {
        throw new Error(
            `AutoCare deletion invariants failed: ${failures.map(({ name, count }) => `${name}=${count}`).join(', ')}`,
        )
    }
}
