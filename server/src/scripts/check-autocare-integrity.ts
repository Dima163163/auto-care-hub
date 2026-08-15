import { AppDataSource } from '../database/data-source.js'

type IntegrityCheck = { name: string; sql: string }

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
            for (const [table, constraint] of [
                ['autocare_service_requests', 'FK_autocare_requests_provider_location'],
                ['autocare_service_requests', 'FK_autocare_requests_offering_context'],
                ['autocare_broadcast_offers', 'FK_autocare_broadcast_offers_provider_location'],
                ['autocare_guarantee_claims', 'FK_autocare_guarantee_claims_request_context'],
                ['autocare_service_quotes', 'FK_autocare_service_quotes_request'],
                ['autocare_service_quotes', 'FK_autocare_service_quotes_provider'],
            ] as const) {
                await AppDataSource.query(`ALTER TABLE "${table}" VALIDATE CONSTRAINT "${constraint}"`)
                console.log(`[autocare-integrity] validated ${constraint}`)
            }
        }
    } finally {
        await AppDataSource.destroy()
    }
}

run().catch((error: unknown) => {
    console.error('[autocare-integrity] failed', error)
    process.exitCode = 1
})
