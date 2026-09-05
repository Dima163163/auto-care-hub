import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { evaluateAutonomousPlan, formatAutonomousPlanReport } from './check-pilot-autonomous-plan.mjs'

const planPath = resolve(fileURLToPath(new URL('..', import.meta.url)), 'docs/operations/PILOT_AUTONOMOUS_100_NEXT.md')

export function evaluateNextAutonomousPlan(source, options = {}) {
    return evaluateAutonomousPlan(source, { strict: true, ...options })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const result = evaluateNextAutonomousPlan(readFileSync(planPath, 'utf8'))
    console.log(formatAutonomousPlanReport(result))
    if (result.failures.length > 0) process.exitCode = 1
}
