import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const PLAN_PATH = resolve(PROJECT_ROOT, 'docs/operations/PILOT_AUTONOMOUS_100_EXECUTION.md')

export function parseAutonomousPlan(source) {
    const items = []
    const pattern = /^(\d+)\. \`\[([x~E])\]\` (.+)$/gm
    for (const match of String(source).matchAll(pattern)) {
        items.push({ number: Number(match[1]), status: match[2], description: match[3] })
    }
    return items
}

export function evaluateAutonomousPlan(source, { strict = false } = {}) {
    const items = parseAutonomousPlan(source)
    const expectedNumbers = Array.from({ length: 100 }, (_, index) => index + 1)
    const actualNumbers = items.map((item) => item.number)
    const missingNumbers = expectedNumbers.filter((number) => !actualNumbers.includes(number))
    const duplicateNumbers = actualNumbers.filter((number, index) => actualNumbers.indexOf(number) !== index)
    const invalidStatuses = items.filter((item) => !['x', '~', 'E'].includes(item.status))
    const incomplete = items.filter((item) => item.status !== 'x')
    const failures = []

    if (items.length !== 100) failures.push(`expected 100 numbered items, found ${items.length}`)
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
    }
}

export function formatAutonomousPlanReport(result) {
    const lines = [
        'Autonomous pilot plan contract',
        `[${result.failures.length === 0 ? 'PASS' : 'BLOCKED'}] 100 numbered items: ${result.items.length}`,
        `[INFO] complete=${result.counts.complete}, partial=${result.counts.partial}, external=${result.counts.external}`,
    ]
    if (result.failures.length > 0) lines.push(...result.failures.map((failure) => `[BLOCKED] ${failure}`))
    return lines.join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const strict = process.argv.includes('--strict')
    const result = evaluateAutonomousPlan(readFileSync(PLAN_PATH, 'utf8'), { strict })
    console.log(formatAutonomousPlanReport(result))
    if (result.failures.length > 0) process.exitCode = 1
}
