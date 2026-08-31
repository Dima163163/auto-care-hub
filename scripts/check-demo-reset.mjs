import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const RESET_PATH = resolve(PROJECT_ROOT, 'server/src/scripts/reset-demo-data.ts')

const REQUIRED_FIXTURE_GUARDS = [
    'DEMO_USER_EMAILS',
    'AUTOMOTIVE_MOCK_PROVIDERS',
    'provider.ownerId === null',
    'demoUserIdSet.has(provider.ownerId ?? \'\')',
    "deleteByAny(manager, 'autocare_service_requests'",
    "deleteByAny(manager, 'autocare_service_locations'",
    "deleteByAny(manager, 'autocare_providers'",
    "deleteByAnyColumns(manager, 'autocare_service_messages'",
    "deleteByAnyColumns(manager, 'autocare_service_attachments'",
    "deleteByAny(manager, 'autocare_capacity_resources'",
    "deleteByAnyColumns(manager, 'autocare_service_quotes'",
    "deleteByAny(manager, 'autocare_bonus_ledger'",
]

const FORBIDDEN_BROAD_OPERATIONS = [
    'TRUNCATE',
    'AuditLogEntity).delete',
    'DELETE FROM "audit_logs"',
    'DELETE FROM "autocare_markets"',
    'DELETE FROM "autocare_location_zones"',
    'DELETE FROM "autocare_service_definitions"',
    'DELETE FROM "autocare_market_countries"',
]

export function evaluateDemoResetSource(source) {
    const missing = REQUIRED_FIXTURE_GUARDS.filter((fragment) => !source.includes(fragment))
    const forbidden = FORBIDDEN_BROAD_OPERATIONS.filter((fragment) => source.includes(fragment))
    const usesParameterizedIds = source.includes('ANY($1::uuid[])') && source.includes('ids: string[]')

    return {
        missing,
        forbidden,
        usesParameterizedIds,
        passed: missing.length === 0 && forbidden.length === 0 && usesParameterizedIds,
    }
}

export function runDemoResetChecks(root = PROJECT_ROOT) {
    const source = readFileSync(resolve(root, 'server/src/scripts/reset-demo-data.ts'), 'utf8')
    const evaluation = evaluateDemoResetSource(source)
    return [
        {
            name: 'Fixture ownership guard',
            status: evaluation.missing.length === 0 ? 'pass' : 'blocked',
            detail: evaluation.missing.length === 0
                ? 'reset is scoped to demo users and known AutoCare fixture providers'
                : `missing guards: ${evaluation.missing.join(', ')}`,
        },
        {
            name: 'Parameterized delete guard',
            status: evaluation.usesParameterizedIds ? 'pass' : 'blocked',
            detail: evaluation.usesParameterizedIds
                ? 'UUID ids are passed as PostgreSQL parameters; no interpolated identifiers'
                : 'all scoped deletes must use parameterized uuid arrays',
        },
        {
            name: 'Shared catalog protection',
            status: evaluation.forbidden.length === 0 ? 'pass' : 'blocked',
            detail: evaluation.forbidden.length === 0
                ? 'markets, zones, countries and service definitions remain intact for real data'
                : `forbidden broad operations: ${evaluation.forbidden.join(', ')}`,
        },
    ]
}

function formatResults(results) {
    const lines = ['Demo reset safety contract']
    for (const result of results) lines.push(`[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)
    lines.push(results.every((result) => result.status === 'pass')
        ? 'Result: demo reset is fixture-scoped and preserves shared catalog data.'
        : 'Result: blocked by demo reset safety contract.')
    return lines.join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const results = runDemoResetChecks()
    console.log(formatResults(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}
