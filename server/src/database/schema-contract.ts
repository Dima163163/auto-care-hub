import { AppDataSource } from './data-source.js'
import {
    getMigrationHistoryMismatch,
    getMissingSchemaColumns,
    getMissingSchemaConstraints,
    getMissingSchemaIndexes,
    getMissingSchemaTables,
    type SchemaMigration,
} from './schema-contract-policy.js'

export type SchemaContractStatus = {
    missingTables: string[]
    missingColumns: string[]
    missingIndexes: string[]
    missingConstraints: string[]
    missingMigrations: string[]
    aheadMigrations: string[]
}

export type SchemaContractReasonCode =
    | 'missing_tables'
    | 'missing_columns'
    | 'missing_indexes'
    | 'missing_constraints'
    | 'pending_migrations'
    | 'ahead_migrations'

export class SchemaContractError extends Error {
    constructor(readonly status: SchemaContractStatus) {
        super(getSchemaContractErrorMessage(status) ?? 'Database schema contract is incomplete.')
        this.name = 'SchemaContractError'
    }
}

type SchemaQueryExecutor = {
    query: (query: string, parameters?: unknown[]) => Promise<unknown>
}

const REQUIRED_TABLES_QUERY = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
`

const REQUIRED_COLUMNS_QUERY = `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'bookings' AND column_name = 'idempotency_key')
        OR (table_name = 'user_sessions' AND column_name IN ('revoked_at', 'revocation_reason'))
        OR (table_name = 'security_events' AND column_name IN ('type', 'correlation_id', 'createdAt', 'severity', 'route', 'status_code', 'metadata', 'actor_role', 'auth_outcome', 'rate_limit_result', 'request_size_bytes', 'reason_code', 'proxy_provenance'))
        OR (table_name = 'security_event_actions' AND column_name IN ('security_event_id', 'actor_id', 'assignee_id', 'status', 'created_at'))
        OR (table_name = 'outbox_events' AND column_name IN ('idempotencyKey', 'status', 'attempts', 'availableAt', 'createdAt'))
        OR (table_name = 'autocare_service_requests' AND column_name IN ('bookingSnapshot', 'bookingCreatedAt', 'vehicleId'))
        OR (table_name = 'client_vehicles' AND column_name IN ('licensePlate', 'internalNumber'))
        OR (table_name = 'autocare_service_offerings' AND column_name IN ('bookingMode', 'requiredResourceTypes', 'requiredResourceIds'))
        OR (table_name = 'autocare_capacity_resources' AND column_name IN ('providerId', 'locationId', 'type', 'name', 'capacity', 'active'))
        OR (table_name = 'autocare_capacity_reservations' AND column_name IN ('requestId', 'resourceId', 'providerId', 'locationId', 'startsAt', 'endsAt', 'status'))
        OR (table_name = 'autocare_bonus_programs' AND column_name = 'providerId')
        OR (table_name = 'autocare_bonus_accounts' AND column_name IN ('clientId', 'providerId'))
        OR (table_name = 'autocare_bonus_ledger' AND column_name IN ('accountId', 'idempotencyKey'))
        OR (table_name = 'autocare_provider_invitations' AND column_name IN ('tokenHash', 'expiresAt'))
        OR (table_name = 'autocare_provider_daily_metrics' AND column_name IN ('providerId', 'day', 'impressions', 'profileOpens'))
        OR (table_name = 'autocare_provider_change_requests' AND column_name IN ('providerId', 'kind', 'status', 'payload'))
        OR (table_name = 'autocare_catalog_gap_requests' AND column_name IN ('proposedSlug', 'status', 'rationale'))
        OR (table_name = 'autocare_chat_reports' AND column_name IN ('threadId', 'reporterId', 'status'))
        OR (table_name = 'autocare_chat_blocks' AND column_name IN ('threadId', 'blockedUserId', 'status'))
        OR (table_name = 'autocare_market_countries' AND column_name IN ('code', 'capabilities', 'legalLinks'))
        OR (table_name = 'autocare_markets' AND column_name IN ('countryId', 'capabilities', 'legalLinks'))
      )
`

const REQUIRED_INDEXES_QUERY = `
    SELECT
        table_info.relname AS tablename,
        index_table.relname AS indexname,
        index_info.indisunique,
        COALESCE(
            json_agg(attribute.attname ORDER BY indexed_column.ordinality)
                FILTER (WHERE attribute.attname IS NOT NULL),
            '[]'::json
        ) AS columns
    FROM pg_class AS table_info
    JOIN pg_namespace AS table_namespace
      ON table_namespace.oid = table_info.relnamespace
    JOIN pg_index AS index_info
      ON index_info.indrelid = table_info.oid
    JOIN pg_class AS index_table
      ON index_table.oid = index_info.indexrelid
    LEFT JOIN LATERAL unnest(index_info.indkey)
        WITH ORDINALITY AS indexed_column(attnum, ordinality)
      ON true
    LEFT JOIN pg_attribute AS attribute
      ON attribute.attrelid = table_info.oid
     AND attribute.attnum = indexed_column.attnum
    WHERE table_namespace.nspname = 'public'
      AND table_info.relname IN ('bookings', 'autocare_reviews', 'security_events', 'security_event_actions', 'outbox_events', 'autocare_bonus_programs', 'autocare_bonus_accounts', 'autocare_bonus_ledger', 'autocare_provider_invitations', 'autocare_provider_daily_metrics', 'autocare_provider_change_requests', 'autocare_catalog_gap_requests', 'autocare_chat_reports', 'autocare_chat_blocks', 'autocare_market_countries', 'autocare_markets', 'autocare_service_requests', 'autocare_capacity_resources', 'autocare_capacity_reservations')
    GROUP BY table_info.relname, index_table.relname, index_info.indisunique
`

const REQUIRED_CONSTRAINTS_QUERY = `
    SELECT table_name, constraint_name, NULL::text AS on_delete
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name IN ('bookings', 'autocare_bonus_accounts', 'autocare_bonus_ledger', 'autocare_provider_invitations', 'autocare_provider_daily_metrics', 'autocare_provider_change_requests', 'autocare_catalog_gap_requests', 'autocare_chat_reports', 'autocare_chat_blocks', 'autocare_capacity_resources', 'autocare_capacity_reservations', 'security_events', 'security_event_actions', 'outbox_events')
    UNION ALL
    SELECT
        table_info.relname AS table_name,
        schema_constraint.conname AS constraint_name,
        CASE schema_constraint.confdeltype
            WHEN 'a' THEN 'NO ACTION'
            WHEN 'r' THEN 'RESTRICT'
            WHEN 'c' THEN 'CASCADE'
            WHEN 'n' THEN 'SET NULL'
            WHEN 'd' THEN 'SET DEFAULT'
            ELSE NULL
        END AS on_delete
    FROM pg_constraint AS schema_constraint
    JOIN pg_class AS table_info
      ON table_info.oid = schema_constraint.conrelid
    JOIN pg_namespace AS table_namespace
      ON table_namespace.oid = table_info.relnamespace
    WHERE table_namespace.nspname = 'public'
      AND table_info.relname IN ('bookings', 'autocare_bonus_accounts', 'autocare_bonus_ledger', 'autocare_provider_invitations', 'autocare_provider_daily_metrics', 'autocare_provider_change_requests', 'autocare_catalog_gap_requests', 'autocare_chat_reports', 'autocare_chat_blocks', 'autocare_capacity_resources', 'autocare_capacity_reservations', 'security_events', 'security_event_actions', 'outbox_events', 'autocare_markets')
      AND schema_constraint.contype IN ('f', 'x')
`

const APPLIED_MIGRATIONS_QUERY = `
    SELECT "timestamp", "name"
    FROM "migrations"
    ORDER BY "timestamp" ASC
`

function getBundledMigrations(): SchemaMigration[] {
    return AppDataSource.migrations.map((migration) => {
        const name = migration.name ?? migration.constructor.name
        const timestampText = name.match(/(\d{13})$/)?.[1]
        const timestamp = Number(timestampText)
        if (!Number.isSafeInteger(timestamp)) {
            throw new Error('Bundled migration inventory is invalid.')
        }
        return { name, timestamp }
    })
}

export function getSchemaContractErrorMessage(status: SchemaContractStatus) {
    const missing = [
        ...status.missingTables.map((name) => `table:${name}`),
        ...status.missingColumns,
        ...status.missingIndexes,
        ...status.missingConstraints,
        ...status.missingMigrations.map((name) => `migration:${name}`),
        ...status.aheadMigrations.map((name) => `migration-ahead:${name}`),
    ]

    return missing.length > 0
        ? `Database schema contract is incomplete: ${missing.join(', ')}`
        : null
}

export function getSchemaContractReasonCodes(status: SchemaContractStatus): SchemaContractReasonCode[] {
    const reasons: SchemaContractReasonCode[] = []
    if (status.missingTables.length > 0) reasons.push('missing_tables')
    if (status.missingColumns.length > 0) reasons.push('missing_columns')
    if (status.missingIndexes.length > 0) reasons.push('missing_indexes')
    if (status.missingConstraints.length > 0) reasons.push('missing_constraints')
    if (status.missingMigrations.length > 0) reasons.push('pending_migrations')
    if (status.aheadMigrations.length > 0) reasons.push('ahead_migrations')
    return reasons
}

export function assertSchemaContract(status: SchemaContractStatus) {
    const message = getSchemaContractErrorMessage(status)
    if (message) throw new SchemaContractError(status)
}

export async function getSchemaContractStatus(
    queryExecutor: SchemaQueryExecutor = AppDataSource,
): Promise<SchemaContractStatus> {
    const tableRows = await queryExecutor.query(REQUIRED_TABLES_QUERY) as Array<{ table_name: string }>
    const missingTables = getMissingSchemaTables(tableRows)
    const [columnRows, indexRows, constraintRows, migrationRows] = await Promise.all([
        queryExecutor.query(REQUIRED_COLUMNS_QUERY) as Promise<
            Array<{ table_name: string; column_name: string }>
        >,
        queryExecutor.query(REQUIRED_INDEXES_QUERY) as Promise<
            Array<{
                tablename: string
                indexname: string
                indisunique: boolean
                columns: Array<string | null>
            }>
        >,
        queryExecutor.query(REQUIRED_CONSTRAINTS_QUERY) as Promise<
            Array<{ table_name: string; constraint_name: string; on_delete: string | null }>
        >,
        missingTables.includes('migrations')
            ? Promise.resolve([])
            : queryExecutor.query(APPLIED_MIGRATIONS_QUERY) as Promise<
                Array<{ timestamp: string | number; name: string }>
            >,
    ])
    const migrationMismatch = missingTables.includes('migrations')
        ? { missing: [], ahead: [] }
        : getMigrationHistoryMismatch(
            getBundledMigrations(),
            migrationRows.map((migration) => ({
                name: migration.name,
                timestamp: Number(migration.timestamp),
            })),
        )

    return {
        missingTables,
        missingColumns: getMissingSchemaColumns(columnRows),
        missingIndexes: getMissingSchemaIndexes(indexRows),
        missingConstraints: getMissingSchemaConstraints(constraintRows),
        missingMigrations: migrationMismatch.missing,
        aheadMigrations: migrationMismatch.ahead,
    }
}

export async function assertDatabaseSchemaContract() {
    const status = await getSchemaContractStatus()
    assertSchemaContract(status)
}
