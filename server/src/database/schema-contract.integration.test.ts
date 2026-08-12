import { describe, expect, it } from 'vitest'

import { AppDataSource } from './data-source.js'
import { RepairBookingIdempotencyKey1785430000000 } from './migrations/1785430000000-RepairBookingIdempotencyKey.js'
import { getSchemaContractStatus } from './schema-contract.js'

describe('database schema contract integration', () => {
    it('matches the bundled schema after migrations have run', async () => {
        await expect(getSchemaContractStatus()).resolves.toEqual({
            missingTables: [],
            missingColumns: [],
            missingIndexes: [],
            missingConstraints: [],
            missingMigrations: [],
            aheadMigrations: [],
        })
    })

    it('repairs a missing idempotency column inside a rollback-safe transaction', async () => {
        const queryRunner = AppDataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            await queryRunner.query(
                'ALTER TABLE "public"."bookings" DROP COLUMN IF EXISTS "idempotency_key"',
            )
            await new RepairBookingIdempotencyKey1785430000000().up(queryRunner)

            const columns = await queryRunner.query(`
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'bookings'
                  AND column_name = 'idempotency_key'
            `)

            expect(columns).toHaveLength(1)
        } finally {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()
        }
    })

    it('rebuilds a same-named idempotency index with the expected shape', async () => {
        const queryRunner = AppDataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            await queryRunner.query(
                'DROP INDEX IF EXISTS "public"."IDX_bookings_client_idempotency_key"',
            )
            await queryRunner.query(
                'CREATE INDEX "IDX_bookings_client_idempotency_key" ON "public"."bookings" ("clientId")',
            )
            await new RepairBookingIdempotencyKey1785430000000().up(queryRunner)

            const indexes = await queryRunner.query(`
                SELECT
                    index_info.indisunique AS is_unique,
                    json_agg(attribute.attname ORDER BY indexed_column.ordinality) AS columns
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
                  AND table_info.relname = 'bookings'
                  AND index_table.relname = 'IDX_bookings_client_idempotency_key'
                GROUP BY index_info.indisunique
            `)

            expect(indexes).toEqual([
                {
                    is_unique: true,
                    columns: ['clientId', 'idempotency_key'],
                },
            ])
        } finally {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()
        }
    })

    it('reports a missing required table before workers can start', async () => {
        const queryRunner = AppDataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            await queryRunner.query('DROP TABLE "public"."booking_payment_disputes"')

            const status = await getSchemaContractStatus(queryRunner)

            expect(status.missingTables).toContain('booking_payment_disputes')
            expect(status.missingMigrations).toEqual([])
        } finally {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()
        }
    })

    it('reports a missing required index before workers can start', async () => {
        const queryRunner = AppDataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            await queryRunner.query(
                'DROP INDEX "public"."IDX_booking_payments_booking"',
            )

            const status = await getSchemaContractStatus(queryRunner)

            expect(status.missingIndexes).toContain('booking_payments.IDX_booking_payments_booking')
        } finally {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()
        }
    })

    it('reports an applied migration that is ahead of the bundled inventory', async () => {
        const queryRunner = AppDataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            await queryRunner.query(
                'INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)',
                [2790000000000, 'UnbundledMigration2790000000000'],
            )

            const status = await getSchemaContractStatus(queryRunner)

            expect(status.aheadMigrations).toContain('UnbundledMigration2790000000000')
        } finally {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()
        }
    })
})
