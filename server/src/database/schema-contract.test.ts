import { describe, expect, it, vi } from 'vitest'

import { AppDataSource } from './data-source.js'
import {
    assertSchemaContract,
    getSchemaContractStatus,
    getSchemaContractErrorMessage,
    getSchemaContractReasonCodes,
    SchemaContractError,
} from './schema-contract.js'
import {
    REQUIRED_SCHEMA_TABLES,
    REQUIRED_SCHEMA_COLUMNS,
    REQUIRED_SCHEMA_CONSTRAINTS,
    REQUIRED_SCHEMA_INDEXES,
} from './schema-contract-policy.js'

describe('database schema contract gate', () => {
    it('reads the versioned contract through five bounded catalog queries', async () => {
        const query = vi.spyOn(AppDataSource, 'query')
            .mockResolvedValueOnce(REQUIRED_SCHEMA_TABLES.map((table) => ({
                table_name: table.tableName,
            })))
            .mockResolvedValueOnce(REQUIRED_SCHEMA_COLUMNS.map((column) => ({
                table_name: column.tableName,
                column_name: column.columnName,
            })))
            .mockResolvedValueOnce(REQUIRED_SCHEMA_INDEXES.map((index) => ({
                tablename: index.tableName,
                indexname: index.indexName,
                indisunique: index.unique ?? false,
                columns: index.columns ? [...index.columns] : [],
            })))
            .mockResolvedValueOnce(REQUIRED_SCHEMA_CONSTRAINTS.map((constraint) => ({
                table_name: constraint.tableName,
                constraint_name: constraint.constraintName,
                on_delete: constraint.onDelete ?? null,
            })))
            .mockResolvedValueOnce([{
                timestamp: '1785480000000',
                name: 'CurrentMigration1785480000000',
            }])
        const previousMigrations = AppDataSource.migrations
        AppDataSource.migrations = [{
            name: 'CurrentMigration1785480000000',
        }] as typeof previousMigrations

        try {
            await expect(getSchemaContractStatus()).resolves.toEqual({
                missingColumns: [],
                missingIndexes: [],
                missingConstraints: [],
                missingMigrations: [],
                aheadMigrations: [],
                missingTables: [],
            })
            expect(query).toHaveBeenCalledTimes(5)
            expect(query.mock.calls[2]?.[0]).toContain('pg_index')
            expect(query.mock.calls[2]?.[0]).toContain("'client_vehicles'")
            expect(query.mock.calls[3]?.[0]).toContain('information_schema.table_constraints')
            expect(query.mock.calls[3]?.[0]).toContain('pg_constraint')
        } finally {
            AppDataSource.migrations = previousMigrations
            query.mockRestore()
        }
    })

    it('does not query an absent migrations table', async () => {
        const query = vi.spyOn(AppDataSource, 'query')
            .mockResolvedValueOnce([{ table_name: 'bookings' }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])

        try {
            const status = await getSchemaContractStatus()

            expect(status.missingTables).toContain('migrations')
            expect(status.missingMigrations).toEqual([])
            expect(query).toHaveBeenCalledTimes(4)
            expect(query.mock.calls.some(([sql]) => String(sql).includes('FROM "migrations"'))).toBe(false)
        } finally {
            query.mockRestore()
        }
    })

    it('returns no error for a complete contract', () => {
        expect(getSchemaContractErrorMessage({
            missingTables: [],
            missingColumns: [],
            missingIndexes: [],
            missingConstraints: [],
            missingMigrations: [],
            aheadMigrations: [],
        })).toBeNull()
    })

    it('fails with bounded operator-safe names for incomplete contracts', () => {
        const status = {
            missingTables: ['security_events'],
            missingColumns: ['security_events.type'],
            missingIndexes: ['security_events.IDX_security_events_type_created_at_id'],
            missingConstraints: ['security_events.CHK_security_events_type'],
            missingMigrations: ['AddSecurityEvents1785440000000'],
            aheadMigrations: ['UnknownMigration1789999999999'],
        }

        expect(getSchemaContractErrorMessage(status)).toContain('security_events.type')
        expect(getSchemaContractErrorMessage(status)).toContain('table:security_events')
        expect(() => assertSchemaContract(status)).toThrow(
            'Database schema contract is incomplete:',
        )
        expect(() => assertSchemaContract(status)).toThrow(SchemaContractError)
        expect(getSchemaContractErrorMessage(status)).toContain('migration:AddSecurityEvents1785440000000')
        expect(getSchemaContractErrorMessage(status)).toContain('migration-ahead:UnknownMigration1789999999999')
        expect(getSchemaContractReasonCodes(status)).toEqual([
            'missing_tables',
            'missing_columns',
            'missing_indexes',
            'missing_constraints',
            'pending_migrations',
            'ahead_migrations',
        ])
    })

    it('surfaces the booking idempotency column incident before workers start', () => {
        const status = {
            missingTables: [],
            missingColumns: ['bookings.idempotency_key'],
            missingIndexes: [],
            missingConstraints: [],
            missingMigrations: [],
            aheadMigrations: [],
        }

        expect(getSchemaContractErrorMessage(status)).toBe(
            'Database schema contract is incomplete: bookings.idempotency_key',
        )
        expect(getSchemaContractReasonCodes(status)).toEqual(['missing_columns'])
    })
})
