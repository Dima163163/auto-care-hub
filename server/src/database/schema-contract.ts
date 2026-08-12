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
        OR (table_name = 'security_event_actions' AND column_name IN ('security_event_id', 'actor_id', 'status', 'created_at'))
        OR (table_name = 'booking_payment_invoices' AND column_name IN ('payment_id', 'booking_id', 'invoice_id', 'status'))
        OR (table_name = 'booking_payments' AND column_name IN ('bookingId', 'refunded_amount'))
        OR (table_name = 'outbox_events' AND column_name IN ('idempotencyKey', 'status', 'attempts', 'availableAt', 'createdAt'))
        OR (table_name = 'booking_payment_attempts' AND column_name IN ('payment_id', 'booking_id', 'attempt_number', 'idempotency_key', 'status', 'created_at'))
        OR (table_name = 'booking_payment_refunds' AND column_name IN ('payment_id', 'booking_id', 'provider_refund_id', 'provider_charge_id', 'amount_minor', 'currency', 'reason', 'status', 'created_at', 'updated_at'))
        OR (table_name = 'booking_payment_disputes' AND column_name IN ('payment_id', 'booking_id', 'provider_dispute_id', 'provider_charge_id', 'amount_minor', 'currency', 'reason', 'provider_status', 'status', 'last_event_id', 'last_event_created_at', 'created_at', 'updated_at'))
        OR (table_name = 'stripe_webhook_events' AND column_name IN ('stripe_event_id', 'status', 'created_at', 'lease_token', 'lease_expires_at'))
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
      AND table_info.relname IN ('bookings', 'security_events', 'security_event_actions', 'booking_payment_invoices', 'booking_payments', 'outbox_events', 'booking_payment_attempts', 'booking_payment_refunds', 'booking_payment_disputes', 'stripe_webhook_events')
    GROUP BY table_info.relname, index_table.relname, index_info.indisunique
`

const REQUIRED_CONSTRAINTS_QUERY = `
    SELECT table_name, constraint_name, NULL::text AS on_delete
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name IN ('bookings', 'security_events', 'security_event_actions', 'booking_payment_invoices', 'booking_payments', 'outbox_events', 'booking_payment_attempts', 'booking_payment_refunds', 'booking_payment_disputes', 'stripe_webhook_events')
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
      AND table_info.relname IN ('bookings', 'security_events', 'security_event_actions', 'booking_payment_invoices', 'booking_payments', 'outbox_events', 'booking_payment_attempts', 'booking_payment_refunds', 'booking_payment_disputes', 'stripe_webhook_events')
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
