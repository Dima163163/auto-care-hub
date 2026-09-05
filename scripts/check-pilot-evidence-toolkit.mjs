import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const FILE = 'scripts/pilot-metrics-tools.mjs'
const FRAGMENTS = [
    'schemaVersion: 1',
    'parseAnonymizedPilotMetricsCsv',
    'summarizePilotMetrics',
    'validatePilotEvidenceEnvelope',
    'duplicate-participant-id',
    'duplicate-journey-id',
    'stale-or-invalid-timestamp',
    'negative',
    'PII_COLUMN_PATTERN',
]

export async function evaluatePilotEvidenceToolkit(root = ROOT) {
    const source = await readFile(resolve(root, FILE), 'utf8').catch(() => '')
    const missing = FRAGMENTS.filter((fragment) => !source.includes(fragment))
    return missing.length === 0
        ? [{ name: 'pilot evidence toolkit', status: 'pass', detail: 'schema, duplicate, freshness, non-negative metric, CSV conversion and PII guards are present' }]
        : [{ name: 'pilot evidence toolkit', status: 'blocked', detail: `missing controls: ${missing.join('; ')}` }]
}

async function main() {
    const results = await evaluatePilotEvidenceToolkit()
    console.log(['Pilot evidence toolkit contract', ...results.map((result) => `[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)].join('\n'))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
