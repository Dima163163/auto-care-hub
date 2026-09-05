import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseAnonymizedPilotMetricsCsv, validatePilotMetricsConsistency } from './pilot-metrics-tools.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

function numberEnv(name, fallback) {
    const value = Number(process.env[name] ?? fallback)
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number.`)
    return value
}

async function main() {
    const csvPath = process.env.PILOT_METRICS_CSV
    const evidencePath = process.env.PILOT_EVIDENCE_FILE
    if (!csvPath || !evidencePath) {
        console.error('PILOT_METRICS_CSV and PILOT_EVIDENCE_FILE are required; aggregate pilot metrics cannot be accepted without source rows.')
        process.exitCode = 1
        return
    }
    try {
        const [csv, evidenceSource] = await Promise.all([
            readFile(resolve(csvPath), 'utf8'),
            readFile(resolve(evidencePath), 'utf8'),
        ])
        const records = parseAnonymizedPilotMetricsCsv(csv)
        const evidence = JSON.parse(evidenceSource)
        const result = validatePilotMetricsConsistency(records, evidence?.metrics, {
            maxP95ResponseMinutes: numberEnv('PILOT_MAX_P95_RESPONSE_MINUTES', 30),
            minConfirmationReliabilityPercent: numberEnv('PILOT_MIN_CONFIRMATION_RELIABILITY_PERCENT', 95),
        })
        console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : [
            'AutoCare Hub pilot metrics consistency gate',
            `[${result.mismatches.length === 0 ? 'PASS' : 'BLOCKED'}] Aggregate metrics match ${records.length} anonymized actor/journey rows.`,
            `[${result.thresholds.responseP95 ? 'PASS' : 'BLOCKED'}] Response p95 <= configured threshold.`,
            `[${result.thresholds.confirmationReliability ? 'PASS' : 'BLOCKED'}] Confirmation reliability >= configured threshold.`,
            ...(result.mismatches.length > 0 ? [`Mismatches: ${result.mismatches.map((item) => `${item.field} expected=${item.expected} actual=${item.actual}`).join('; ')}`] : []),
            `Result: ${result.pass ? 'pilot metrics accepted' : 'blocked by consistency or reliability thresholds'}.`,
        ].join('\n'))
        if (!result.pass) process.exitCode = 1
    } catch (error) {
        console.error(`[pilot-metrics] ${error instanceof Error ? error.message : String(error)}`)
        process.exitCode = 1
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
