import type { MigrationInterface, QueryRunner } from 'typeorm'

type DuplicatePrimaryRow = { count?: string | number }

/**
 * A client may have at most one primary vehicle. Existing duplicate primary
 * rows must be reconciled before the invariant is installed.
 */
export class AddClientVehiclePrimaryUniqueIndex1786320000000 implements MigrationInterface {
    name = 'AddClientVehiclePrimaryUniqueIndex1786320000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const duplicateRows = await queryRunner.query(`
            SELECT COUNT(*)::int AS "count"
            FROM "client_vehicles"
            WHERE "isPrimary" = TRUE
            GROUP BY "userId"
            HAVING COUNT(*) > 1
        `) as DuplicatePrimaryRow[]

        if (!Array.isArray(duplicateRows)) {
            throw new Error('Client vehicle primary duplicate preflight returned an invalid result.')
        }

        for (const row of duplicateRows) {
            const duplicateCount = Number(row.count)
            if (!Number.isSafeInteger(duplicateCount) || duplicateCount < 2) {
                throw new Error('Client vehicle primary duplicate preflight returned an invalid count.')
            }
        }

        if (duplicateRows.length > 0) {
            throw new Error(
                `Cannot add client vehicle primary uniqueness: ${duplicateRows.length} duplicate key group(s) require reconciliation.`,
            )
        }

        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_client_vehicles_primary" ON "client_vehicles" ("userId") WHERE "isPrimary" = TRUE`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_client_vehicles_primary"`)
    }
}
