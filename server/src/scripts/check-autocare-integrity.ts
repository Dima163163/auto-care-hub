import { AppDataSource } from '../database/data-source.js'

type IntegrityCheck = { name: string; sql: string }
type UnvalidatedConstraint = { tableName: string; constraintName: string }

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
        name: 'broadcast offer provider/location ownership',
        sql: `SELECT COUNT(*)::int AS count FROM autocare_broadcast_offers offer
               LEFT JOIN autocare_service_locations location ON location.id = offer."locationId" AND location."providerId" = offer."providerId"
               WHERE location.id IS NULL`,
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
