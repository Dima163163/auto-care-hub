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
               OR thread."subject" = $2`,
    },
    { name: 'bonus accounts are removed', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_bonus_accounts" WHERE "clientId" = $1' },
    { name: 'bonus ledger entries are removed', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_bonus_ledger" WHERE "clientId" = $1' },
    { name: 'review promos are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_review_promos" WHERE "clientId" = $1 OR "redeemedById" = $1' },
    { name: 'AutoCare reviews are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_reviews" WHERE "clientId" = $1' },
    { name: 'platform reviews are detached', sql: 'SELECT COUNT(*)::int AS count FROM "platform_reviews" WHERE "clientId" = $1' },
    { name: 'chat threads are detached', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1' },
    { name: 'security events are detached', sql: 'SELECT COUNT(*)::int AS count FROM "security_events" WHERE "user_id" = $1' },
    { name: 'reviews are anonymized', sql: 'SELECT COUNT(*)::int AS count FROM "reviews" WHERE "clientId" = $1 AND "text" <> $2' },
    {
        name: 'service request private snapshots are redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "autocare_service_requests"
            WHERE "clientId" = $1
              AND ("contactSnapshot" IS NOT NULL OR "vehicleSnapshot" IS NOT NULL OR "note" IS NOT NULL
                OR "cancellationReason" IS NOT NULL OR "noShowReason" IS NOT NULL OR "completionNote" IS NOT NULL)`,
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
              AND ("summary" <> $2 OR cardinality("evidenceUrls") > 0 OR "resolution" IS NOT NULL)`,
    },
    {
        name: 'expert questions are redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "autocare_expert_questions"
            WHERE "clientId" = $1
              AND ("symptoms" <> $2 OR "vehicleSnapshot" IS NOT NULL OR "answer" IS NOT NULL)`,
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
            WHERE (message."senderId" = $1 OR request."clientId" = $1 OR thread."subject" = $2)
              AND (message."body" IS NOT NULL OR message."offer" IS NOT NULL)`,
    },
    { name: 'repair event payloads are redacted', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_repair_events" event JOIN "autocare_service_requests" request ON request."id" = event."requestId" WHERE request."clientId" = $1 AND (event."title" <> $2 OR event."notes" IS NOT NULL OR event."metadata" <> \'{}\'::jsonb)' },
    { name: 'provider change request payloads are redacted', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_provider_change_requests" WHERE "requestedById" = $1 AND "payload" <> \'{"redacted": true}\'::jsonb' },
    {
        name: 'catalog gap request payloads are redacted',
        sql: `SELECT COUNT(*)::int AS count FROM "autocare_catalog_gap_requests"
            WHERE "requestedById" = $1
              AND ("labels" <> '{}'::jsonb OR "comparisonAttributes" <> '[]'::jsonb OR "rationale" <> $2)`,
    },
    { name: 'appeal evidence is redacted', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_appeals" WHERE "submittedById" = $1 AND ("reason" <> $2 OR cardinality("evidenceIds") > 0)' },
    { name: 'reschedule reasons are redacted', sql: 'SELECT COUNT(*)::int AS count FROM "autocare_reschedule_requests" WHERE "requestedById" = $1 AND "reason" IS NOT NULL' },
    {
        name: 'account-related chat report descriptions are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_chat_reports" report
            LEFT JOIN "autocare_chat_threads" thread ON thread."id" = report."threadId"
            WHERE (report."reporterId" = $1 OR report."reportedUserId" = $1 OR thread."subject" = $2)
              AND report."description" IS NOT NULL`,
    },
    {
        name: 'account-related chat block reasons are redacted',
        sql: `SELECT COUNT(*)::int AS count
            FROM "autocare_chat_blocks" block
            LEFT JOIN "autocare_chat_threads" thread ON thread."id" = block."threadId"
            WHERE (block."blockerId" = $1 OR block."blockedUserId" = $1 OR thread."subject" = $2)
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
