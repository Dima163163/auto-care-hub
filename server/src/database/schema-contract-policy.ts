export type SchemaColumn = {
    tableName: string
    columnName: string
}

export type SchemaTable = {
    tableName: string
}

export type SchemaIndex = {
    tableName: string
    indexName: string
    unique?: boolean
    columns?: readonly string[]
}

export type SchemaConstraint = {
    tableName: string
    constraintName: string
    onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL'
}

export type SchemaMigration = {
    name: string
    timestamp: number
}

export const REQUIRED_SCHEMA_TABLES: readonly SchemaTable[] = [
    { tableName: 'bookings' },
    { tableName: 'user_sessions' },
    { tableName: 'security_events' },
    { tableName: 'security_event_actions' },
    { tableName: 'booking_payment_invoices' },
    { tableName: 'booking_payments' },
    { tableName: 'outbox_events' },
    { tableName: 'booking_payment_attempts' },
    { tableName: 'booking_payment_refunds' },
    { tableName: 'booking_payment_disputes' },
    { tableName: 'stripe_webhook_events' },
    { tableName: 'migrations' },
]

export const REQUIRED_SCHEMA_COLUMNS: readonly SchemaColumn[] = [
    { tableName: 'bookings', columnName: 'idempotency_key' },
    { tableName: 'user_sessions', columnName: 'revoked_at' },
    { tableName: 'user_sessions', columnName: 'revocation_reason' },
    { tableName: 'security_events', columnName: 'type' },
    { tableName: 'security_events', columnName: 'correlation_id' },
    { tableName: 'security_events', columnName: 'createdAt' },
    { tableName: 'security_events', columnName: 'severity' },
    { tableName: 'security_events', columnName: 'route' },
    { tableName: 'security_events', columnName: 'status_code' },
    { tableName: 'security_events', columnName: 'metadata' },
    { tableName: 'security_events', columnName: 'actor_role' },
    { tableName: 'security_events', columnName: 'auth_outcome' },
    { tableName: 'security_events', columnName: 'rate_limit_result' },
    { tableName: 'security_events', columnName: 'request_size_bytes' },
    { tableName: 'security_events', columnName: 'reason_code' },
    { tableName: 'security_events', columnName: 'proxy_provenance' },
    { tableName: 'security_event_actions', columnName: 'security_event_id' },
    { tableName: 'security_event_actions', columnName: 'actor_id' },
    { tableName: 'security_event_actions', columnName: 'assignee_id' },
    { tableName: 'security_event_actions', columnName: 'status' },
    { tableName: 'security_event_actions', columnName: 'created_at' },
    { tableName: 'booking_payment_invoices', columnName: 'payment_id' },
    { tableName: 'booking_payment_invoices', columnName: 'booking_id' },
    { tableName: 'booking_payment_invoices', columnName: 'invoice_id' },
    { tableName: 'booking_payment_invoices', columnName: 'status' },
    { tableName: 'booking_payments', columnName: 'bookingId' },
    { tableName: 'booking_payments', columnName: 'refunded_amount' },
    { tableName: 'outbox_events', columnName: 'idempotencyKey' },
    { tableName: 'outbox_events', columnName: 'status' },
    { tableName: 'outbox_events', columnName: 'attempts' },
    { tableName: 'outbox_events', columnName: 'availableAt' },
    { tableName: 'outbox_events', columnName: 'createdAt' },
    { tableName: 'booking_payment_attempts', columnName: 'payment_id' },
    { tableName: 'booking_payment_attempts', columnName: 'booking_id' },
    { tableName: 'booking_payment_attempts', columnName: 'attempt_number' },
    { tableName: 'booking_payment_attempts', columnName: 'idempotency_key' },
    { tableName: 'booking_payment_attempts', columnName: 'status' },
    { tableName: 'booking_payment_attempts', columnName: 'created_at' },
    { tableName: 'booking_payment_refunds', columnName: 'payment_id' },
    { tableName: 'booking_payment_refunds', columnName: 'booking_id' },
    { tableName: 'booking_payment_refunds', columnName: 'provider_refund_id' },
    { tableName: 'booking_payment_refunds', columnName: 'provider_charge_id' },
    { tableName: 'booking_payment_refunds', columnName: 'amount_minor' },
    { tableName: 'booking_payment_refunds', columnName: 'currency' },
    { tableName: 'booking_payment_refunds', columnName: 'reason' },
    { tableName: 'booking_payment_refunds', columnName: 'status' },
    { tableName: 'booking_payment_refunds', columnName: 'created_at' },
    { tableName: 'booking_payment_refunds', columnName: 'updated_at' },
    { tableName: 'booking_payment_disputes', columnName: 'payment_id' },
    { tableName: 'booking_payment_disputes', columnName: 'booking_id' },
    { tableName: 'booking_payment_disputes', columnName: 'provider_dispute_id' },
    { tableName: 'booking_payment_disputes', columnName: 'provider_charge_id' },
    { tableName: 'booking_payment_disputes', columnName: 'amount_minor' },
    { tableName: 'booking_payment_disputes', columnName: 'currency' },
    { tableName: 'booking_payment_disputes', columnName: 'reason' },
    { tableName: 'booking_payment_disputes', columnName: 'provider_status' },
    { tableName: 'booking_payment_disputes', columnName: 'status' },
    { tableName: 'booking_payment_disputes', columnName: 'last_event_id' },
    { tableName: 'booking_payment_disputes', columnName: 'last_event_created_at' },
    { tableName: 'booking_payment_disputes', columnName: 'created_at' },
    { tableName: 'booking_payment_disputes', columnName: 'updated_at' },
    { tableName: 'stripe_webhook_events', columnName: 'stripe_event_id' },
    { tableName: 'stripe_webhook_events', columnName: 'status' },
    { tableName: 'stripe_webhook_events', columnName: 'created_at' },
    { tableName: 'stripe_webhook_events', columnName: 'lease_token' },
    { tableName: 'stripe_webhook_events', columnName: 'lease_expires_at' },
]

export function getMissingSchemaTables(
    rows: readonly { table_name: string }[],
    required = REQUIRED_SCHEMA_TABLES,
) {
    const existing = new Set(rows.map((row) => row.table_name))
    return required
        .map((table) => table.tableName)
        .filter((table) => !existing.has(table))
}

export const REQUIRED_SCHEMA_INDEXES: readonly SchemaIndex[] = [
    {
        tableName: 'bookings',
        indexName: 'IDX_bookings_client_idempotency_key',
        unique: true,
        columns: ['clientId', 'idempotency_key'],
    },
    {
        tableName: 'security_events',
        indexName: 'IDX_security_events_user_created_at_id',
    },
    {
        tableName: 'security_events',
        indexName: 'IDX_security_events_type_created_at_id',
    },
    {
        tableName: 'security_events',
        indexName: 'IDX_security_events_ip_created_at_id',
    },
    {
        tableName: 'security_events',
        indexName: 'IDX_security_events_route_created_at_id',
    },
    {
        tableName: 'security_events',
        indexName: 'IDX_security_events_severity_created_at_id',
    },
    {
        tableName: 'security_events',
        indexName: 'IDX_security_events_auth_outcome_created_at_id',
    },
    {
        tableName: 'security_events',
        indexName: 'IDX_security_events_rate_limit_created_at_id',
    },
    {
        tableName: 'security_event_actions',
        indexName: 'IDX_security_event_actions_event_created_at',
    },
    {
        tableName: 'security_event_actions',
        indexName: 'IDX_security_event_actions_assignee_created_at',
    },
    {
        tableName: 'booking_payment_invoices',
        indexName: 'UQ_booking_payment_invoices_payment_id',
    },
    {
        tableName: 'booking_payment_invoices',
        indexName: 'UQ_booking_payment_invoices_invoice_id',
    },
    {
        tableName: 'booking_payment_invoices',
        indexName: 'IDX_booking_payment_invoices_status_issued_at',
    },
    {
        tableName: 'booking_payments',
        indexName: 'IDX_booking_payments_booking',
    },
    {
        tableName: 'outbox_events',
        indexName: 'IDX_outbox_status_available',
    },
    {
        tableName: 'booking_payment_attempts',
        indexName: 'UQ_booking_payment_attempts_idempotency_key',
    },
    {
        tableName: 'booking_payment_attempts',
        indexName: 'UQ_booking_payment_attempts_payment_attempt_number',
    },
    {
        tableName: 'booking_payment_attempts',
        indexName: 'UQ_booking_payment_attempts_stripe_session',
    },
    {
        tableName: 'booking_payment_attempts',
        indexName: 'IDX_booking_payment_attempts_payment_created',
    },
    {
        tableName: 'booking_payment_refunds',
        indexName: 'UQ_booking_payment_refunds_provider_id',
    },
    {
        tableName: 'booking_payment_refunds',
        indexName: 'IDX_booking_payment_refunds_payment_created',
    },
    {
        tableName: 'booking_payment_disputes',
        indexName: 'UQ_booking_payment_disputes_provider_id',
    },
    {
        tableName: 'booking_payment_disputes',
        indexName: 'IDX_booking_payment_disputes_payment_created',
    },
    {
        tableName: 'stripe_webhook_events',
        indexName: 'IDX_stripe_webhook_events_status_created_at',
    },
    {
        tableName: 'stripe_webhook_events',
        indexName: 'IDX_stripe_webhook_events_status_lease',
    },
]

export const REQUIRED_SCHEMA_CONSTRAINTS: readonly SchemaConstraint[] = [
    {
        tableName: 'bookings',
        constraintName: 'CHK_bookings_time_range',
    },
    {
        tableName: 'bookings',
        constraintName: 'EXCL_bookings_active_time_overlap',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_failed_attempts',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_type',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_severity',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_status_code',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_actor_role',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_auth_outcome',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_rate_limit_result',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_request_size',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_reason_code',
    },
    {
        tableName: 'security_events',
        constraintName: 'CHK_security_events_proxy_provenance',
    },
    {
        tableName: 'security_event_actions',
        constraintName: 'CHK_security_event_actions_status',
    },
    {
        tableName: 'security_event_actions',
        constraintName: 'FK_security_event_actions_event',
    },
    {
        tableName: 'security_event_actions',
        constraintName: 'FK_security_event_actions_actor',
    },
    {
        tableName: 'security_event_actions',
        constraintName: 'FK_security_event_actions_assignee',
    },
    {
        tableName: 'booking_payment_invoices',
        constraintName: 'FK_booking_payment_invoices_payment',
        onDelete: 'RESTRICT',
    },
    {
        tableName: 'booking_payment_invoices',
        constraintName: 'FK_booking_payment_invoices_booking',
        onDelete: 'RESTRICT',
    },
    {
        tableName: 'booking_payment_invoices',
        constraintName: 'CHK_booking_payment_invoices_amount',
    },
    {
        tableName: 'booking_payments',
        constraintName: 'FK_booking_payments_booking',
        onDelete: 'RESTRICT',
    },
    {
        tableName: 'booking_payments',
        constraintName: 'CHK_booking_payments_refunded_amount',
    },
    {
        tableName: 'outbox_events',
        constraintName: 'UQ_outbox_idempotency_key',
    },
    {
        tableName: 'booking_payment_attempts',
        constraintName: 'UQ_booking_payment_attempts_payment_attempt_number',
    },
    {
        tableName: 'booking_payment_attempts',
        constraintName: 'UQ_booking_payment_attempts_idempotency_key',
    },
    {
        tableName: 'booking_payment_attempts',
        constraintName: 'FK_booking_payment_attempts_payment',
    },
    {
        tableName: 'booking_payment_attempts',
        constraintName: 'FK_booking_payment_attempts_booking',
    },
    {
        tableName: 'booking_payment_attempts',
        constraintName: 'CHK_booking_payment_attempts_attempt_number',
    },
    {
        tableName: 'booking_payment_refunds',
        constraintName: 'FK_booking_payment_refunds_payment',
        onDelete: 'RESTRICT',
    },
    {
        tableName: 'booking_payment_refunds',
        constraintName: 'FK_booking_payment_refunds_booking',
        onDelete: 'RESTRICT',
    },
    {
        tableName: 'booking_payment_refunds',
        constraintName: 'CHK_booking_payment_refunds_amount',
    },
    {
        tableName: 'booking_payment_disputes',
        constraintName: 'FK_booking_payment_disputes_payment',
        onDelete: 'RESTRICT',
    },
    {
        tableName: 'booking_payment_disputes',
        constraintName: 'FK_booking_payment_disputes_booking',
        onDelete: 'RESTRICT',
    },
    {
        tableName: 'booking_payment_disputes',
        constraintName: 'CHK_booking_payment_disputes_amount',
    },
    {
        tableName: 'stripe_webhook_events',
        constraintName: 'UQ_stripe_webhook_events_event_id',
    },
]

export function getMissingSchemaColumns(
    rows: readonly { table_name: string; column_name: string }[],
    required = REQUIRED_SCHEMA_COLUMNS,
) {
    const existing = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`))
    return required
        .map((column) => `${column.tableName}.${column.columnName}`)
        .filter((column) => !existing.has(column))
}

export function getMissingSchemaIndexes(
    rows: readonly {
        tablename: string
        indexname: string
        indisunique?: boolean
        columns?: readonly (string | null)[] | null
    }[],
    required = REQUIRED_SCHEMA_INDEXES,
) {
    return required
        .filter((requiredIndex) => !rows.some((row) => {
            if (
                row.tablename !== requiredIndex.tableName
                || row.indexname !== requiredIndex.indexName
            ) {
                return false
            }

            if (
                requiredIndex.unique !== undefined
                && row.indisunique !== requiredIndex.unique
            ) {
                return false
            }

            if (requiredIndex.columns !== undefined) {
                return (
                    row.columns?.length === requiredIndex.columns.length
                    && row.columns.every((column, index) => column === requiredIndex.columns?.[index])
                )
            }

            return true
        }))
        .map((index) => `${index.tableName}.${index.indexName}`)
}

export function getMissingSchemaConstraints(
    rows: readonly { table_name: string; constraint_name: string; on_delete?: string | null }[],
    required = REQUIRED_SCHEMA_CONSTRAINTS,
) {
    return required
        .filter((requiredConstraint) => {
            const matches = rows.filter((row) => (
                row.table_name === requiredConstraint.tableName
                && row.constraint_name === requiredConstraint.constraintName
            ))

            if (matches.length === 0) return true
            if (!requiredConstraint.onDelete) return false

            const observedActions = matches
                .map((row) => row.on_delete)
                .filter((action): action is string => Boolean(action))

            return observedActions.length > 0 && observedActions.some(
                (action) => action !== requiredConstraint.onDelete,
            )
        })
        .map((constraint) => `${constraint.tableName}.${constraint.constraintName}`)
}

export function getMigrationHistoryMismatch(
    bundled: readonly SchemaMigration[],
    applied: readonly SchemaMigration[],
) {
    const bundledByName = new Map(bundled.map((migration) => [migration.name, migration]))
    const appliedByName = new Map(applied.map((migration) => [migration.name, migration]))
    const missing = bundled
        .filter((migration) => !appliedByName.has(migration.name))
        .map((migration) => migration.name)
    const ahead = applied
        .filter((migration) => !bundledByName.has(migration.name))
        .map((migration) => migration.name)
    const timestampMismatch = applied
        .filter((migration) => {
            const expected = bundledByName.get(migration.name)
            return expected !== undefined && expected.timestamp !== migration.timestamp
        })
        .map((migration) => migration.name)

    return {
        missing,
        ahead: [...ahead, ...timestampMismatch],
    }
}
