import { describe, expect, it } from 'vitest'

import {
    getMigrationHistoryMismatch,
    getMissingSchemaColumns,
    getMissingSchemaConstraints,
    getMissingSchemaIndexes,
    getMissingSchemaTables,
    REQUIRED_SCHEMA_INDEXES,
} from './schema-contract-policy.js'

describe('schema contract policy', () => {
    it('reports missing required tables explicitly', () => {
        expect(getMissingSchemaTables([
            { table_name: 'bookings' },
            { table_name: 'migrations' },
        ], [
            { tableName: 'bookings' },
            { tableName: 'security_events' },
        ])).toEqual(['security_events'])
    })

    it('reports only required columns absent from the database', () => {
        expect(getMissingSchemaColumns([
            { table_name: 'bookings', column_name: 'idempotency_key' },
        ], [
            { tableName: 'bookings', columnName: 'idempotency_key' },
            { tableName: 'user_sessions', columnName: 'revoked_at' },
        ])).toEqual(['user_sessions.revoked_at'])
    })

    it('returns an empty list for a complete contract', () => {
        expect(getMissingSchemaColumns([
            { table_name: 'bookings', column_name: 'idempotency_key' },
            { table_name: 'user_sessions', column_name: 'revoked_at' },
            { table_name: 'user_sessions', column_name: 'revocation_reason' },
            { table_name: 'security_events', column_name: 'type' },
            { table_name: 'security_events', column_name: 'correlation_id' },
            { table_name: 'security_events', column_name: 'createdAt' },
            { table_name: 'security_events', column_name: 'severity' },
            { table_name: 'security_events', column_name: 'route' },
            { table_name: 'security_events', column_name: 'status_code' },
            { table_name: 'security_events', column_name: 'metadata' },
            { table_name: 'security_events', column_name: 'actor_role' },
            { table_name: 'security_events', column_name: 'auth_outcome' },
            { table_name: 'security_events', column_name: 'rate_limit_result' },
            { table_name: 'security_events', column_name: 'request_size_bytes' },
            { table_name: 'security_events', column_name: 'reason_code' },
            { table_name: 'security_events', column_name: 'proxy_provenance' },
            { table_name: 'security_event_actions', column_name: 'security_event_id' },
            { table_name: 'security_event_actions', column_name: 'actor_id' },
            { table_name: 'security_event_actions', column_name: 'assignee_id' },
            { table_name: 'security_event_actions', column_name: 'status' },
            { table_name: 'security_event_actions', column_name: 'created_at' },
            { table_name: 'booking_payment_invoices', column_name: 'payment_id' },
            { table_name: 'booking_payment_invoices', column_name: 'booking_id' },
            { table_name: 'booking_payment_invoices', column_name: 'invoice_id' },
            { table_name: 'booking_payment_invoices', column_name: 'status' },
            { table_name: 'booking_payments', column_name: 'bookingId' },
            { table_name: 'booking_payments', column_name: 'refunded_amount' },
            { table_name: 'outbox_events', column_name: 'idempotencyKey' },
            { table_name: 'outbox_events', column_name: 'status' },
            { table_name: 'outbox_events', column_name: 'attempts' },
            { table_name: 'outbox_events', column_name: 'availableAt' },
            { table_name: 'outbox_events', column_name: 'createdAt' },
            { table_name: 'booking_payment_attempts', column_name: 'payment_id' },
            { table_name: 'booking_payment_attempts', column_name: 'booking_id' },
            { table_name: 'booking_payment_attempts', column_name: 'attempt_number' },
            { table_name: 'booking_payment_attempts', column_name: 'idempotency_key' },
            { table_name: 'booking_payment_attempts', column_name: 'status' },
            { table_name: 'booking_payment_attempts', column_name: 'created_at' },
            { table_name: 'booking_payment_refunds', column_name: 'payment_id' },
            { table_name: 'booking_payment_refunds', column_name: 'booking_id' },
            { table_name: 'booking_payment_refunds', column_name: 'provider_refund_id' },
            { table_name: 'booking_payment_refunds', column_name: 'provider_charge_id' },
            { table_name: 'booking_payment_refunds', column_name: 'amount_minor' },
            { table_name: 'booking_payment_refunds', column_name: 'currency' },
            { table_name: 'booking_payment_refunds', column_name: 'reason' },
            { table_name: 'booking_payment_refunds', column_name: 'status' },
            { table_name: 'booking_payment_refunds', column_name: 'created_at' },
            { table_name: 'booking_payment_refunds', column_name: 'updated_at' },
            { table_name: 'booking_payment_disputes', column_name: 'payment_id' },
            { table_name: 'booking_payment_disputes', column_name: 'booking_id' },
            { table_name: 'booking_payment_disputes', column_name: 'provider_dispute_id' },
            { table_name: 'booking_payment_disputes', column_name: 'provider_charge_id' },
            { table_name: 'booking_payment_disputes', column_name: 'amount_minor' },
            { table_name: 'booking_payment_disputes', column_name: 'currency' },
            { table_name: 'booking_payment_disputes', column_name: 'reason' },
            { table_name: 'booking_payment_disputes', column_name: 'provider_status' },
            { table_name: 'booking_payment_disputes', column_name: 'status' },
            { table_name: 'booking_payment_disputes', column_name: 'last_event_id' },
            { table_name: 'booking_payment_disputes', column_name: 'last_event_created_at' },
            { table_name: 'booking_payment_disputes', column_name: 'created_at' },
            { table_name: 'booking_payment_disputes', column_name: 'updated_at' },
            { table_name: 'stripe_webhook_events', column_name: 'stripe_event_id' },
            { table_name: 'stripe_webhook_events', column_name: 'status' },
            { table_name: 'stripe_webhook_events', column_name: 'created_at' },
            { table_name: 'stripe_webhook_events', column_name: 'lease_token' },
            { table_name: 'stripe_webhook_events', column_name: 'lease_expires_at' },
        ])).toEqual([])
    })

    it('reports missing financial and security columns', () => {
        expect(getMissingSchemaColumns([
            { table_name: 'bookings', column_name: 'idempotency_key' },
            { table_name: 'user_sessions', column_name: 'revoked_at' },
            { table_name: 'user_sessions', column_name: 'revocation_reason' },
        ])).toEqual([
            'security_events.type',
            'security_events.correlation_id',
            'security_events.createdAt',
            'security_events.severity',
            'security_events.route',
            'security_events.status_code',
            'security_events.metadata',
            'security_events.actor_role',
            'security_events.auth_outcome',
            'security_events.rate_limit_result',
            'security_events.request_size_bytes',
            'security_events.reason_code',
            'security_events.proxy_provenance',
            'security_event_actions.security_event_id',
            'security_event_actions.actor_id',
            'security_event_actions.assignee_id',
            'security_event_actions.status',
            'security_event_actions.created_at',
            'booking_payment_invoices.payment_id',
            'booking_payment_invoices.booking_id',
            'booking_payment_invoices.invoice_id',
            'booking_payment_invoices.status',
            'booking_payments.bookingId',
            'booking_payments.refunded_amount',
            'outbox_events.idempotencyKey',
            'outbox_events.status',
            'outbox_events.attempts',
            'outbox_events.availableAt',
            'outbox_events.createdAt',
            'booking_payment_attempts.payment_id',
            'booking_payment_attempts.booking_id',
            'booking_payment_attempts.attempt_number',
            'booking_payment_attempts.idempotency_key',
            'booking_payment_attempts.status',
            'booking_payment_attempts.created_at',
            'booking_payment_refunds.payment_id',
            'booking_payment_refunds.booking_id',
            'booking_payment_refunds.provider_refund_id',
            'booking_payment_refunds.provider_charge_id',
            'booking_payment_refunds.amount_minor',
            'booking_payment_refunds.currency',
            'booking_payment_refunds.reason',
            'booking_payment_refunds.status',
            'booking_payment_refunds.created_at',
            'booking_payment_refunds.updated_at',
            'booking_payment_disputes.payment_id',
            'booking_payment_disputes.booking_id',
            'booking_payment_disputes.provider_dispute_id',
            'booking_payment_disputes.provider_charge_id',
            'booking_payment_disputes.amount_minor',
            'booking_payment_disputes.currency',
            'booking_payment_disputes.reason',
            'booking_payment_disputes.provider_status',
            'booking_payment_disputes.status',
            'booking_payment_disputes.last_event_id',
            'booking_payment_disputes.last_event_created_at',
            'booking_payment_disputes.created_at',
            'booking_payment_disputes.updated_at',
            'stripe_webhook_events.stripe_event_id',
            'stripe_webhook_events.status',
            'stripe_webhook_events.created_at',
            'stripe_webhook_events.lease_token',
            'stripe_webhook_events.lease_expires_at',
        ])
    })

    it('reports missing critical indexes and unique relations', () => {
        expect(getMissingSchemaIndexes([
            {
                tablename: 'bookings',
                indexname: 'IDX_bookings_client_idempotency_key',
            },
        ], [
            {
                tableName: 'bookings',
                indexName: 'IDX_bookings_client_idempotency_key',
            },
            {
                tableName: 'security_events',
                indexName: 'IDX_security_events_type_created_at_id',
            },
        ])).toEqual([
            'security_events.IDX_security_events_type_created_at_id',
        ])
    })

    it('rejects a booking idempotency index with the wrong shape', () => {
        const bookingIndex = REQUIRED_SCHEMA_INDEXES.find(
            (index) => index.indexName === 'IDX_bookings_client_idempotency_key',
        )

        expect(bookingIndex).toBeDefined()
        expect(getMissingSchemaIndexes([
            {
                tablename: 'bookings',
                indexname: 'IDX_bookings_client_idempotency_key',
                indisunique: false,
                columns: ['clientId'],
            },
        ], bookingIndex ? [bookingIndex] : [])).toEqual([
            'bookings.IDX_bookings_client_idempotency_key',
        ])
        expect(getMissingSchemaIndexes([
            {
                tablename: 'bookings',
                indexname: 'IDX_bookings_client_idempotency_key',
                indisunique: true,
                columns: ['clientId', 'idempotency_key'],
            },
        ], bookingIndex ? [bookingIndex] : [])).toEqual([])
    })

    it('reports missing integrity constraints', () => {
        expect(getMissingSchemaConstraints([
            {
                table_name: 'bookings',
                constraint_name: 'CHK_bookings_time_range',
            },
        ], [
            {
                tableName: 'bookings',
                constraintName: 'CHK_bookings_time_range',
            },
            {
                tableName: 'booking_payment_invoices',
                constraintName: 'FK_booking_payment_invoices_payment',
            },
        ])).toEqual([
            'booking_payment_invoices.FK_booking_payment_invoices_payment',
        ])
    })

    it('rejects a financial foreign key with a destructive delete action', () => {
        expect(getMissingSchemaConstraints([
            {
                table_name: 'booking_payment_invoices',
                constraint_name: 'FK_booking_payment_invoices_payment',
                on_delete: 'CASCADE',
            },
        ], [
            {
                tableName: 'booking_payment_invoices',
                constraintName: 'FK_booking_payment_invoices_payment',
                onDelete: 'RESTRICT',
            },
        ])).toEqual(['booking_payment_invoices.FK_booking_payment_invoices_payment'])
    })

    it('detects pending, marked-ahead, and timestamp-drifted migrations', () => {
        expect(getMigrationHistoryMismatch([
            { name: 'InitialSchema1781370550060', timestamp: 1781370550060 },
            { name: 'AddBookingListIndexes1785350000000', timestamp: 1785350000000 },
        ], [
            { name: 'InitialSchema1781370550060', timestamp: 1781370550060 },
            { name: 'AddBookingListIndexes1785350000000', timestamp: 1785350000001 },
            { name: 'UnknownMigration1789999999999', timestamp: 1789999999999 },
        ])).toEqual({
            missing: [],
            ahead: [
                'UnknownMigration1789999999999',
                'AddBookingListIndexes1785350000000',
            ],
        })
    })
})
