import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { evaluatePilotEvidence, formatPilotEvidenceReport } from './pilot-evidence-policy.js'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const DEFAULT_EVIDENCE_PATH = 'docs/operations/pilot-evidence.json'

export function resolvePilotEvidencePath(configuredPath?: string) {
    const value = configuredPath?.trim() || DEFAULT_EVIDENCE_PATH
    return isAbsolute(value) ? value : resolve(PROJECT_ROOT, value)
}

export async function runPilotEvidenceCheck(configuredPath = process.env.PILOT_EVIDENCE_FILE) {
    const evidencePath = resolvePilotEvidencePath(configuredPath)
    const displayPath = configuredPath?.trim() || DEFAULT_EVIDENCE_PATH
    let input: unknown
    try {
        input = JSON.parse(await readFile(evidencePath, 'utf8')) as unknown
    } catch (error) {
        console.error(`[pilot-evidence] cannot read ${displayPath}: provide an anonymized real-pilot evidence file (${error instanceof Error ? error.message : 'invalid JSON'})`)
        return 1
    }

    const checks = evaluatePilotEvidence(input)
    console.log(process.argv.includes('--json') ? JSON.stringify(checks, null, 2) : formatPilotEvidenceReport(checks))
    return checks.some((check) => check.status === 'blocked') ? 1 : 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    runPilotEvidenceCheck().then((exitCode) => {
        if (exitCode !== 0) process.exitCode = exitCode
    }).catch((error: unknown) => {
        console.error('[pilot-evidence] failed', error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
}
