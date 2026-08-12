import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Repairs deployments where the original idempotency migration was skipped
 * or marked as applied while the column/index was absent from the database.
 */
export class RepairBookingIdempotencyKey1785430000000 implements MigrationInterface {
    name = 'RepairBookingIdempotencyKey1785430000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const columns = await queryRunner.query(`
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'bookings'
              AND column_name = 'idempotency_key'
        `) as Array<{ '?column?': number }>

        if (columns.length === 0) {
            await queryRunner.query(
                'ALTER TABLE "bookings" ADD "idempotency_key" character varying(128)',
            )
        }

        const indexes = await queryRunner.query(`
            SELECT
                index_info.indisunique,
                array_agg(attribute.attname ORDER BY indexed_column.ordinality) AS columns
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
        `) as Array<{ indisunique: boolean; columns: Array<string | null> }>

        const index = indexes[0]
        const hasExpectedIndex =
            index?.indisunique === true
            && index.columns.length === 2
            && index.columns[0] === 'clientId'
            && index.columns[1] === 'idempotency_key'

        if (!hasExpectedIndex) {
            if (indexes.length > 0) {
                await queryRunner.query(
                    'DROP INDEX "public"."IDX_bookings_client_idempotency_key"',
                )
            }

            await queryRunner.query(
                'CREATE UNIQUE INDEX "IDX_bookings_client_idempotency_key" ON "bookings" ("clientId", "idempotency_key")',
            )
        }
    }

    public async down(): Promise<void> {
        // This repair is intentionally forward-only; the original migration
        // remains the owner of the column and index during rollback planning.
    }
}
