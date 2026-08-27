import { readFile } from 'node:fs/promises'

import { evaluatePilotEvidence, formatPilotEvidenceReport } from './pilot-evidence-policy.js'

const evidencePath = process.env.PILOT_EVIDENCE_FILE ?? 'docs/operations/pilot-evidence.json'

async function run() {
    let input: unknown
    try {
        input = JSON.parse(await readFile(evidencePath, 'utf8')) as unknown
    } catch (error) {
        console.error(`[pilot-evidence] cannot read ${evidencePath}: provide an anonymized real-pilot evidence file (${error instanceof Error ? error.message : 'invalid JSON'})`)
        process.exitCode = 1
        return
    }

    const checks = evaluatePilotEvidence(input)
    console.log(process.argv.includes('--json') ? JSON.stringify(checks, null, 2) : formatPilotEvidenceReport(checks))
    if (checks.some((check) => check.status === 'blocked')) process.exitCode = 1
}

run().catch((error: unknown) => {
    console.error('[pilot-evidence] failed', error instanceof Error ? error.message : error)
    process.exitCode = 1
})
