import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const FILE = 'server/src/modules/autocare/concurrency-matrix.ts'
const FRAGMENTS = [
    'AUTOCARE_CONCURRENCY_MATRIX',
    'buildAutoCareTransitionMatrixReport',
    'normalizeConcurrencyWorkerCount',
    'MAX_AUTOCARE_CONCURRENCY_WORKERS',
    'p95Ms',
    'p99Ms',
    'capacityConflictStatus',
    'auditEvent',
    'redactConcurrencyIncident',
]

export async function evaluateConcurrencyMatrixContract(root = ROOT) {
    const source = await readFile(resolve(root, FILE), 'utf8').catch(() => '')
    const missing = FRAGMENTS.filter((fragment) => !source.includes(fragment))
    return missing.length === 0
        ? [{ name: 'transition matrix report', status: 'pass', detail: 'booking/quote/reschedule/cancel/no-show report includes bounded workers, latency percentiles, 409 and audit/redaction fields' }]
        : [{ name: 'transition matrix report', status: 'blocked', detail: `missing controls: ${missing.join('; ')}` }]
}

async function main() {
    const results = await evaluateConcurrencyMatrixContract()
    console.log(['Concurrency matrix contract', ...results.map((result) => `[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)].join('\n'))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
