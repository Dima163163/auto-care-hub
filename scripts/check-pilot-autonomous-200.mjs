import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { evaluateAutonomousPlan, parseAutonomousPlan } from './check-pilot-autonomous-plan.mjs'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const FIRST_HALF_PATH = resolve(PROJECT_ROOT, 'docs/operations/PILOT_AUTONOMOUS_100_EXECUTION.md')
const SECOND_HALF_PATH = resolve(PROJECT_ROOT, 'docs/operations/PILOT_AUTONOMOUS_100_NEXT.md')

export function parseCombinedAutonomousPlan(firstHalfSource, secondHalfSource) {
    const firstHalf = parseAutonomousPlan(firstHalfSource)
    const secondHalf = parseAutonomousPlan(secondHalfSource).map((item) => ({
        ...item,
        number: item.number + 100,
    }))
    return [...firstHalf, ...secondHalf]
}

export function evaluateCombinedAutonomousPlan(firstHalfSource, secondHalfSource, { strict = false } = {}) {
    const firstHalf = evaluateAutonomousPlan(firstHalfSource, { strict: false })
    const secondHalf = evaluateAutonomousPlan(secondHalfSource, { strict: false })
    const items = parseCombinedAutonomousPlan(firstHalfSource, secondHalfSource)
    const expectedNumbers = Array.from({ length: 200 }, (_, index) => index + 1)
    const actualNumbers = items.map((item) => item.number)
    const missingNumbers = expectedNumbers.filter((number) => !actualNumbers.includes(number))
    const duplicateNumbers = actualNumbers.filter((number, index) => actualNumbers.indexOf(number) !== index)
    const invalidStatuses = items.filter((item) => !['x', '~', 'E'].includes(item.status))
    const incomplete = items.filter((item) => item.status !== 'x')
    const failures = [
        ...firstHalf.failures.map((failure) => `first half: ${failure}`),
        ...secondHalf.failures.map((failure) => `second half: ${failure}`),
    ]

    if (items.length !== 200) failures.push(`expected 200 numbered items, found ${items.length}`)
    if (missingNumbers.length > 0) failures.push(`missing item numbers: ${missingNumbers.join(', ')}`)
    if (duplicateNumbers.length > 0) failures.push(`duplicate item numbers: ${[...new Set(duplicateNumbers)].join(', ')}`)
    if (invalidStatuses.length > 0) failures.push(`invalid statuses at: ${invalidStatuses.map((item) => item.number).join(', ')}`)
    if (strict && incomplete.length > 0) failures.push(`strict mode requires all items complete; incomplete: ${incomplete.map((item) => item.number).join(', ')}`)

    return {
        items,
        failures,
        counts: {
            complete: items.filter((item) => item.status === 'x').length,
            partial: items.filter((item) => item.status === '~').length,
            external: items.filter((item) => item.status === 'E').length,
        },
        readiness: Math.round((items.filter((item) => item.status === 'x').length / 200) * 1000) / 10,
    }
}

export function formatCombinedAutonomousPlanReport(result) {
    const lines = [
        'Autonomous pilot 200-point plan contract',
        `[${result.failures.length === 0 ? 'PASS' : 'BLOCKED'}] 200 numbered items: ${result.items.length}`,
        `[INFO] complete=${result.counts.complete}, partial=${result.counts.partial}, external=${result.counts.external}, readiness=${result.readiness}%`,
    ]
    if (result.failures.length > 0) lines.push(...result.failures.map((failure) => `[BLOCKED] ${failure}`))
    return lines.join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const strict = process.argv.includes('--strict')
    const result = evaluateCombinedAutonomousPlan(
        readFileSync(FIRST_HALF_PATH, 'utf8'),
        readFileSync(SECOND_HALF_PATH, 'utf8'),
        { strict },
    )
    console.log(formatCombinedAutonomousPlanReport(result))
    if (result.failures.length > 0) process.exitCode = 1
}
