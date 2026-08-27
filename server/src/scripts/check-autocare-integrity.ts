import { AppDataSource } from '../database/data-source.js'

type IntegrityCheck = { name: string; sql: string }
type UnvalidatedConstraint = { tableName: string; constraintName: string }

/**
 * Critical AutoCare tables are kept in an explicit manifest so a migration
 * cannot silently add a provider/media/bonus/review/branch table without the
 * release checker knowing about it. Relational checks below cover the rows;
 * this manifest covers schema presence and primary-key integrity.
 */
const AUTOCARE_CRITICAL_TABLE_GROUPS = {
    provider: [
        'autocare_providers',
        'autocare_service_locations',
        'autocare_service_offerings',
        'autocare_service_definitions',
        'autocare_provider_memberships',
        'autocare_provider_invitations',
        'autocare_provider_favorites',
        'autocare_provider_change_requests',
    ],
    market: [
        'autocare_market_countries',
        'autocare_markets',
        'autocare_location_zones',
    ],
    media: [
        'autocare_service_attachments',
        'autocare_trust_evidence',
    ],
    bonus: [
        'autocare_bonus_programs',
        'autocare_bonus_accounts',
        'autocare_bonus_ledger',
        'autocare_review_promos',
    ],
    reviews: [
        'autocare_reviews',
        'autocare_review_promos',
        'platform_reviews',
        'reviews',
    ],
    branch: [
        'autocare_service_locations',
        'autocare_service_offerings',
        'autocare_capacity_resources',
        'autocare_capacity_reservations',
        'autocare_trust_snapshots',
        'autocare_provider_daily_metrics',
    ],
    workflow: [
        'autocare_service_requests',
        'autocare_service_quotes',
        'autocare_chat_threads',
        'autocare_service_messages',
        'autocare_chat_reports',
        'autocare_chat_blocks',
        'autocare_reschedule_requests',
        'autocare_broadcast_requests',
        'autocare_broadcast_offers',
        'autocare_guarantee_claims',
        'autocare_expert_questions',
        'autocare_repair_events',
        'autocare_fleet_accounts',
        'autocare_fleet_vehicles',
        'autocare_price_benchmarks',
        'autocare_appeals',
        'autocare_catalog_gap_requests',
    ],
    trust: [
        'autocare_trust_policy',
    ],
} as const

const AUTOCARE_CRITICAL_TABLES = Array.from(new Set(
    Object.values(AUTOCARE_CRITICAL_TABLE_GROUPS).flat(),
))

async function checkCriticalTableManifest() {
    const existingRows = await AppDataSource.query(
        `SELECT table_name AS "tableName"
           FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name = ANY($1::text[])`,
        [AUTOCARE_CRITICAL_TABLES],
    ) as Array<{ tableName: string }>
    const existing = new Set(existingRows.map(({ tableName }) => tableName))
    const missing = AUTOCARE_CRITICAL_TABLES.filter((tableName) => !existing.has(tableName))
    if (missing.length > 0) {
        throw new Error(`AutoCare critical tables are missing: ${missing.join(', ')}`)
    }

    // Fail closed when a future AutoCare migration introduces a table but the
    // release checker has not been taught its ownership/deletion invariants.
    // This prevents a new provider/media/bonus/review/branch table from being
    // silently omitted from the production integrity review.
    const autocareRows = await AppDataSource.query(
        `SELECT table_name AS "tableName"
           FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name LIKE 'autocare_%'`,
    ) as Array<{ tableName: string }>
    const untracked = autocareRows
        .map(({ tableName }) => tableName)
        .filter((tableName) => !existing.has(tableName))
        .sort()
    if (untracked.length > 0) {
        throw new Error(`AutoCare tables are missing from the critical manifest: ${untracked.join(', ')}`)
    }

    const primaryKeyRows = await AppDataSource.query(
        `SELECT relation.relname AS "tableName"
           FROM pg_constraint constraint_row
           JOIN pg_class relation ON relation.oid = constraint_row.conrelid
           JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = current_schema()
            AND constraint_row.contype = 'p'
            AND relation.relname = ANY($1::text[])`,
        [AUTOCARE_CRITICAL_TABLES],
    ) as Array<{ tableName: string }>
    const tablesWithPrimaryKey = new Set(primaryKeyRows.map(({ tableName }) => tableName))
    const withoutPrimaryKey = AUTOCARE_CRITICAL_TABLES.filter((tableName) => !tablesWithPrimaryKey.has(tableName))
    if (withoutPrimaryKey.length > 0) {
        throw new Error(`AutoCare critical tables without a primary key: ${withoutPrimaryKey.join(', ')}`)
    }
    console.log(`[autocare-integrity] critical table manifest: ${AUTOCARE_CRITICAL_TABLES.length} tables checked`)
}

const checks: IntegrityCheck[] = [
    {
        name: 'service request provider/location ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_service_requests request
               LEFT JOIN autocare_service_locations location ON location.id = request."locationId" AND location."providerId" = request."providerId"
               WHERE location.id IS NULL`,
    },
    {
        name: 'service request offering context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_service_requests request
               LEFT JOIN autocare_service_offerings offering ON offering.id = request."offeringId"
                AND offering."locationId" = request."locationId" AND offering."definitionId" = request."definitionId"
               WHERE offering.id IS NULL`,
    },
    {
        name: 'service location provider/market ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_service_locations location
               LEFT JOIN autocare_providers provider ON provider.id = location."providerId"
               LEFT JOIN autocare_markets market ON market.id = location."marketId"
               WHERE provider.id IS NULL OR market.id IS NULL`,
    },
    {
        name: 'service offering location/definition ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_service_offerings offering
               LEFT JOIN autocare_service_locations location ON location.id = offering."locationId"
               LEFT JOIN autocare_service_definitions definition ON definition.id = offering."definitionId"
               WHERE location.id IS NULL OR definition.id IS NULL`,
    },
    {
        name: 'provider invitation provider/location ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_provider_invitations invitation
               LEFT JOIN autocare_providers provider ON provider.id = invitation."providerId"
               LEFT JOIN autocare_service_locations location ON location.id = invitation."locationId" AND location."providerId" = invitation."providerId"
               WHERE provider.id IS NULL OR (invitation."locationId" IS NOT NULL AND location.id IS NULL)`,
    },
    {
        name: 'bonus program provider ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_bonus_programs program
               LEFT JOIN autocare_providers provider ON provider.id = program."providerId"
               WHERE provider.id IS NULL`,
    },
    {
        name: 'bonus account provider ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_bonus_accounts account
               LEFT JOIN autocare_providers provider ON provider.id = account."providerId"
               WHERE provider.id IS NULL`,
    },
    {
        name: 'chat thread request/provider ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_chat_threads thread
               LEFT JOIN autocare_service_requests request ON request.id = thread."requestId"
               LEFT JOIN autocare_providers provider ON provider.id = thread."providerId"
               WHERE (thread."requestId" IS NOT NULL AND request.id IS NULL)
                  OR (thread."providerId" IS NOT NULL AND provider.id IS NULL)`,
    },
    {
        name: 'service message parent context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_service_messages message
               LEFT JOIN autocare_service_requests request ON request.id = message."requestId"
               LEFT JOIN autocare_chat_threads thread ON thread.id = message."threadId"
               WHERE (message."requestId" IS NOT NULL AND request.id IS NULL)
                  OR (message."threadId" IS NOT NULL AND thread.id IS NULL)
                  OR (message."requestId" IS NULL AND message."threadId" IS NULL)`,
    },
    {
        name: 'fleet vehicle account ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_fleet_vehicles vehicle
               LEFT JOIN autocare_fleet_accounts fleet ON fleet.id = vehicle."fleetId"
               WHERE fleet.id IS NULL`,
    },
    {
        name: 'repair event request ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_repair_events event
               LEFT JOIN autocare_service_requests request ON request.id = event."requestId"
               WHERE request.id IS NULL`,
    },
    {
        name: 'broadcast offer provider/location ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_broadcast_offers offer
               LEFT JOIN autocare_service_locations location ON location.id = offer."locationId" AND location."providerId" = offer."providerId"
               LEFT JOIN autocare_broadcast_requests request ON request.id = offer."broadcastRequestId"
               WHERE location.id IS NULL OR request.id IS NULL`,
    },
    {
        name: 'price benchmark market/definition ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_price_benchmarks benchmark
               LEFT JOIN autocare_service_definitions definition ON definition.id = benchmark."serviceDefinitionId"
               LEFT JOIN autocare_markets market ON market.id = benchmark."marketId"
               WHERE definition.id IS NULL OR (benchmark."marketId" IS NOT NULL AND market.id IS NULL)`,
    },
    {
        name: 'trust evidence provider ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_trust_evidence evidence
               LEFT JOIN autocare_providers provider ON provider.id = evidence."providerId"
               WHERE provider.id IS NULL`,
    },
    {
        name: 'guarantee request context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_guarantee_claims claim
               LEFT JOIN autocare_service_requests request ON request.id = claim."requestId"
                AND request."clientId" = claim."clientId" AND request."providerId" = claim."providerId"
               WHERE request.id IS NULL`,
    },
    {
        name: 'quote request/provider ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_service_quotes service_quote
               LEFT JOIN autocare_service_requests request ON request.id = service_quote."requestId" AND request."providerId" = service_quote."providerId"
               WHERE request.id IS NULL`,
    },
    {
        name: 'provider membership location ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_provider_memberships membership
               LEFT JOIN autocare_service_locations location ON location.id = membership."locationId" AND location."providerId" = membership."providerId"
               WHERE membership."locationId" IS NOT NULL AND location.id IS NULL`,
    },
    {
        name: 'provider favorite location ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_provider_favorites favorite
               LEFT JOIN autocare_service_locations location ON location.id = favorite."locationId" AND location."providerId" = favorite."providerId"
               WHERE location.id IS NULL`,
    },
    {
        name: 'capacity resource location/provider ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_capacity_resources resource
               LEFT JOIN autocare_service_locations location ON location.id = resource."locationId" AND location."providerId" = resource."providerId"
               WHERE location.id IS NULL`,
    },
    {
        name: 'capacity reservation resource/request context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_capacity_reservations reservation
               LEFT JOIN autocare_capacity_resources resource ON resource.id = reservation."resourceId"
                AND resource."providerId" = reservation."providerId" AND resource."locationId" = reservation."locationId"
               LEFT JOIN autocare_service_requests request ON request.id = reservation."requestId"
                AND request."providerId" = reservation."providerId" AND request."locationId" = reservation."locationId"
               WHERE resource.id IS NULL OR request.id IS NULL`,
    },
    {
        name: 'AutoCare review request/client/provider context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_reviews review
               LEFT JOIN autocare_service_requests request ON request.id = review."serviceRequestId"
                AND request."providerId" = review."providerId" AND (review."clientId" IS NULL OR request."clientId" = review."clientId")
               WHERE review."serviceRequestId" IS NOT NULL AND request.id IS NULL`,
    },
    {
        name: 'review promo provider/review ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_review_promos promo
               LEFT JOIN autocare_reviews review ON review.id = promo."reviewId" AND review."providerId" = promo."providerId"
               LEFT JOIN autocare_service_requests request ON request.id = promo."serviceRequestId"
               WHERE review.id IS NULL OR (promo."serviceRequestId" IS NOT NULL AND request.id IS NULL)`,
    },
    {
        name: 'bonus ledger account/client/provider context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_bonus_ledger ledger
               LEFT JOIN autocare_bonus_accounts account ON account.id = ledger."accountId"
                AND account."clientId" = ledger."clientId" AND account."providerId" = ledger."providerId"
               WHERE account.id IS NULL`,
    },
    {
        name: 'attachment parent context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_service_attachments attachment
               LEFT JOIN autocare_service_requests request ON request.id = attachment."requestId"
               LEFT JOIN autocare_chat_threads thread ON thread.id = attachment."threadId"
               WHERE (attachment."requestId" IS NOT NULL AND request.id IS NULL)
                  OR (attachment."threadId" IS NOT NULL AND thread.id IS NULL)
                  OR (attachment."requestId" IS NULL AND attachment."threadId" IS NULL)`,
    },
    {
        name: 'trust snapshot location/provider ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_trust_snapshots snapshot
               LEFT JOIN autocare_service_locations location ON location.id = snapshot."locationId" AND location."providerId" = snapshot."providerId"
               WHERE location.id IS NULL`,
    },
    {
        name: 'provider daily metrics provider ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_provider_daily_metrics metric
               LEFT JOIN autocare_providers provider ON provider.id = metric."providerId"
               WHERE provider.id IS NULL`,
    },
    {
        name: 'reschedule request parent context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_reschedule_requests reschedule
               LEFT JOIN autocare_service_requests request ON request.id = reschedule."requestId"
               WHERE request.id IS NULL`,
    },
    {
        name: 'chat report thread context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_chat_reports report
               LEFT JOIN autocare_chat_threads thread ON thread.id = report."threadId"
               WHERE thread.id IS NULL`,
    },
    {
        name: 'provider change request provider context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_provider_change_requests change_request
               LEFT JOIN autocare_providers provider ON provider.id = change_request."providerId"
               WHERE provider.id IS NULL`,
    },
    {
        name: 'catalog gap provider context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_catalog_gap_requests gap
               LEFT JOIN autocare_providers provider ON provider.id = gap."providerId"
               WHERE gap."providerId" IS NOT NULL AND provider.id IS NULL`,
    },
    {
        name: 'appeal provider context',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_appeals appeal
               LEFT JOIN autocare_providers provider ON provider.id = appeal."providerId"
               WHERE appeal."providerId" IS NOT NULL AND provider.id IS NULL`,
    },
]

async function getUnvalidatedAutoCareConstraints(): Promise<UnvalidatedConstraint[]> {
    return AppDataSource.query(`
        SELECT relation.relname AS "tableName", constraint_row.conname AS "constraintName"
        FROM pg_constraint constraint_row
        JOIN pg_class relation ON relation.oid = constraint_row.conrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = current_schema()
          AND relation.relname LIKE 'autocare_%'
          AND constraint_row.contype IN ('f', 'c')
          AND NOT constraint_row.convalidated
        ORDER BY relation.relname, constraint_row.conname
    `) as Promise<UnvalidatedConstraint[]>
}

async function run() {
    await AppDataSource.initialize()
    try {
        await checkCriticalTableManifest()
        const failures: Array<{ name: string; count: number }> = []
        for (const check of checks) {
            const [row] = await AppDataSource.query(check.sql) as Array<{ count: number }>
            const count = Number(row?.count ?? 0)
            console.log(`[autocare-integrity] ${check.name}: ${count}`)
            if (count > 0) failures.push({ name: check.name, count })
        }
        if (failures.length > 0) {
            throw new Error(`AutoCare integrity checks failed: ${failures.map(({ name, count }) => `${name}=${count}`).join(', ')}`)
        }
        if (process.argv.includes('--validate')) {
            const constraints = await getUnvalidatedAutoCareConstraints()
            for (const { tableName, constraintName } of constraints) {
                const quoteIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`
                await AppDataSource.query(`ALTER TABLE ${quoteIdentifier(tableName)} VALIDATE CONSTRAINT ${quoteIdentifier(constraintName)}`)
                console.log(`[autocare-integrity] validated ${tableName}.${constraintName}`)
            }
            console.log(`[autocare-integrity] validated ${constraints.length} pending constraints`)
        }
    } finally {
        await AppDataSource.destroy()
    }
}

run().catch((error: unknown) => {
    console.error('[autocare-integrity] failed', error)
    process.exitCode = 1
})
