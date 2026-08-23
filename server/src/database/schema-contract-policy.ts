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
    { tableName: 'outbox_events' },
    { tableName: 'autocare_bonus_programs' },
    { tableName: 'autocare_bonus_accounts' },
    { tableName: 'autocare_bonus_ledger' },
    { tableName: 'autocare_provider_invitations' },
    { tableName: 'autocare_provider_change_requests' },
    { tableName: 'autocare_catalog_gap_requests' },
    { tableName: 'autocare_chat_reports' },
    { tableName: 'autocare_chat_blocks' },
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
    { tableName: 'outbox_events', columnName: 'idempotencyKey' },
    { tableName: 'outbox_events', columnName: 'status' },
    { tableName: 'outbox_events', columnName: 'attempts' },
    { tableName: 'outbox_events', columnName: 'availableAt' },
    { tableName: 'outbox_events', columnName: 'createdAt' },
    { tableName: 'autocare_service_requests', columnName: 'bookingSnapshot' },
    { tableName: 'autocare_service_requests', columnName: 'bookingCreatedAt' },
    { tableName: 'autocare_service_offerings', columnName: 'bookingMode' },
    { tableName: 'autocare_bonus_programs', columnName: 'providerId' },
    { tableName: 'autocare_bonus_accounts', columnName: 'clientId' },
    { tableName: 'autocare_bonus_accounts', columnName: 'providerId' },
    { tableName: 'autocare_bonus_ledger', columnName: 'accountId' },
    { tableName: 'autocare_bonus_ledger', columnName: 'idempotencyKey' },
    { tableName: 'autocare_provider_invitations', columnName: 'tokenHash' },
    { tableName: 'autocare_provider_invitations', columnName: 'expiresAt' },
    { tableName: 'autocare_provider_change_requests', columnName: 'providerId' },
    { tableName: 'autocare_provider_change_requests', columnName: 'kind' },
    { tableName: 'autocare_provider_change_requests', columnName: 'status' },
    { tableName: 'autocare_provider_change_requests', columnName: 'payload' },
    { tableName: 'autocare_catalog_gap_requests', columnName: 'proposedSlug' },
    { tableName: 'autocare_catalog_gap_requests', columnName: 'status' },
    { tableName: 'autocare_catalog_gap_requests', columnName: 'rationale' },
    { tableName: 'autocare_chat_reports', columnName: 'threadId' },
    { tableName: 'autocare_chat_reports', columnName: 'reporterId' },
    { tableName: 'autocare_chat_reports', columnName: 'status' },
    { tableName: 'autocare_chat_blocks', columnName: 'threadId' },
    { tableName: 'autocare_chat_blocks', columnName: 'blockedUserId' },
    { tableName: 'autocare_chat_blocks', columnName: 'status' },
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
        tableName: 'autocare_reviews',
        indexName: 'UQ_autocare_reviews_service_request',
        unique: true,
        columns: ['serviceRequestId'],
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
        tableName: 'outbox_events',
        indexName: 'IDX_outbox_status_available',
    },
    {
        tableName: 'autocare_bonus_programs',
        indexName: 'UQ_autocare_bonus_programs_provider',
        unique: true,
        columns: ['providerId'],
    },
    {
        tableName: 'autocare_bonus_accounts',
        indexName: 'UQ_autocare_bonus_accounts_client_provider',
        unique: true,
        columns: ['clientId', 'providerId'],
    },
    {
        tableName: 'autocare_bonus_ledger',
        indexName: 'UQ_autocare_bonus_ledger_account_key',
        unique: true,
        columns: ['accountId', 'idempotencyKey'],
    },
    { tableName: 'autocare_provider_invitations', indexName: 'IDX_autocare_provider_invitations_provider_status' },
    { tableName: 'autocare_provider_invitations', indexName: 'IDX_autocare_provider_invitations_email_status' },
    { tableName: 'autocare_provider_invitations', indexName: 'UQ_autocare_provider_invitations_token_hash', unique: true },
    { tableName: 'autocare_provider_invitations', indexName: 'UQ_autocare_provider_invitations_pending_scope', unique: true },
    { tableName: 'autocare_provider_change_requests', indexName: 'IDX_autocare_provider_change_requests_provider_status' },
    { tableName: 'autocare_provider_change_requests', indexName: 'IDX_autocare_provider_change_requests_kind_status' },
    { tableName: 'autocare_provider_change_requests', indexName: 'UQ_autocare_provider_change_requests_pending_kind', unique: true },
    { tableName: 'autocare_catalog_gap_requests', indexName: 'IDX_autocare_catalog_gap_requests_status_created' },
    { tableName: 'autocare_catalog_gap_requests', indexName: 'IDX_autocare_catalog_gap_requests_slug_status' },
    { tableName: 'autocare_catalog_gap_requests', indexName: 'UQ_autocare_catalog_gap_requests_pending_slug', unique: true },
    { tableName: 'autocare_chat_reports', indexName: 'IDX_autocare_chat_reports_status_created' },
    { tableName: 'autocare_chat_reports', indexName: 'IDX_autocare_chat_reports_thread_created' },
    { tableName: 'autocare_chat_reports', indexName: 'UQ_autocare_chat_reports_reporter_thread', unique: true },
    { tableName: 'autocare_chat_blocks', indexName: 'IDX_autocare_chat_blocks_thread_status' },
    { tableName: 'autocare_chat_blocks', indexName: 'IDX_autocare_chat_blocks_blocked_status' },
    { tableName: 'autocare_chat_blocks', indexName: 'UQ_autocare_chat_blocks_scope', unique: true },
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
        tableName: 'outbox_events',
        constraintName: 'UQ_outbox_idempotency_key',
    },
    {
        tableName: 'autocare_bonus_ledger',
        constraintName: 'CHK_autocare_bonus_ledger_nonzero',
    },
    {
        tableName: 'autocare_bonus_accounts',
        constraintName: 'CHK_autocare_bonus_accounts_balance',
    },
    {
        tableName: 'autocare_provider_invitations',
        constraintName: 'CHK_autocare_provider_invitations_email',
    },
    {
        tableName: 'autocare_provider_change_requests',
        constraintName: 'CHK_autocare_provider_change_requests_reason',
    },
    {
        tableName: 'autocare_catalog_gap_requests',
        constraintName: 'CHK_autocare_catalog_gap_requests_slug',
    },
    {
        tableName: 'autocare_catalog_gap_requests',
        constraintName: 'CHK_autocare_catalog_gap_requests_rationale',
    },
    {
        tableName: 'autocare_catalog_gap_requests',
        constraintName: 'CHK_autocare_catalog_gap_requests_reason',
    },
    {
        tableName: 'autocare_provider_invitations',
        constraintName: 'FK_autocare_provider_invitations_provider',
        onDelete: 'CASCADE',
    },
    {
        tableName: 'autocare_provider_invitations',
        constraintName: 'FK_autocare_provider_invitations_location',
        onDelete: 'CASCADE',
    },
    {
        tableName: 'autocare_provider_invitations',
        constraintName: 'FK_autocare_provider_invitations_invited_by',
        onDelete: 'RESTRICT',
    },
    { tableName: 'autocare_chat_reports', constraintName: 'CHK_autocare_chat_reports_description' },
    { tableName: 'autocare_chat_reports', constraintName: 'CHK_autocare_chat_reports_reason' },
    { tableName: 'autocare_chat_blocks', constraintName: 'CHK_autocare_chat_blocks_distinct_users' },
    { tableName: 'autocare_chat_reports', constraintName: 'FK_autocare_chat_reports_thread', onDelete: 'CASCADE' },
    { tableName: 'autocare_chat_reports', constraintName: 'FK_autocare_chat_reports_reporter', onDelete: 'RESTRICT' },
    { tableName: 'autocare_chat_reports', constraintName: 'FK_autocare_chat_reports_reported_user', onDelete: 'SET NULL' },
    { tableName: 'autocare_chat_reports', constraintName: 'FK_autocare_chat_reports_reviewer', onDelete: 'SET NULL' },
    { tableName: 'autocare_chat_blocks', constraintName: 'FK_autocare_chat_blocks_thread', onDelete: 'CASCADE' },
    { tableName: 'autocare_chat_blocks', constraintName: 'FK_autocare_chat_blocks_blocker', onDelete: 'RESTRICT' },
    { tableName: 'autocare_chat_blocks', constraintName: 'FK_autocare_chat_blocks_blocked_user', onDelete: 'CASCADE' },
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
