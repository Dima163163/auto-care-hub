import { fileURLToPath } from 'node:url'

import { AppDataSource } from '../database/data-source.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../entities/account-deletion-request/account-deletion-request.entity.js'
import { checkAutoCareDeletionInvariants } from '../modules/users/account-deletion-invariants.js'

export const DEFAULT_RETENTION_REHEARSAL_LIMIT = 1_000
export const MAX_RETENTION_REHEARSAL_LIMIT = 10_000

export function parseRetentionRehearsalLimit(args: readonly string[] = process.argv.slice(2)) {
    const index = args.indexOf('--limit')
    if (index < 0) return DEFAULT_RETENTION_REHEARSAL_LIMIT
    const value = Number(args[index + 1])
    if (!Number.isSafeInteger(value) || value < 1 || value > MAX_RETENTION_REHEARSAL_LIMIT) {
        throw new Error(`--limit must be an integer between 1 and ${MAX_RETENTION_REHEARSAL_LIMIT}.`)
    }
    return value
}

export function parseRetentionRehearsalOptions(args: readonly string[] = process.argv.slice(2)) {
    return {
        limit: parseRetentionRehearsalLimit(args),
        dryRun: args.includes('--dry-run'),
        json: args.includes('--json'),
    }
}

export function formatRetentionRehearsalReport(input: { checked: number; failures: number }) {
    return input.failures > 0
        ? `Account deletion retention rehearsal blocked: ${input.failures} of ${input.checked} completed deletion(s) failed invariants.`
        : `Account deletion retention rehearsal passed: ${input.checked} completed deletion(s) checked.`
}

export function formatRetentionRehearsalJson(input: { status: 'pass' | 'blocked' | 'dry-run'; limit: number; checked: number; failures: number; failedInvariantNames?: readonly string[] }) {
    return {
        schemaVersion: 1,
        status: input.status,
        limit: input.limit,
        checked: input.checked,
        failures: input.failures,
        failedInvariantNames: [...(input.failedInvariantNames ?? [])],
    }
}

export async function runRetentionRehearsal({ limit = parseRetentionRehearsalLimit(), dryRun = false, json = process.argv.includes('--json') } = {}) {
    if (dryRun) {
        const report = formatRetentionRehearsalJson({ status: 'dry-run', limit, checked: 0, failures: 0 })
        if (json) console.log(JSON.stringify(report))
        else console.log(`[account-deletion-retention] DRY RUN: limit=${limit}; no database was opened.`)
        return report
    }
    await AppDataSource.initialize()
    try {
        const completedRequests = await AppDataSource.getRepository(AccountDeletionRequestEntity)
            .createQueryBuilder('request')
            .select('request.userId', 'userId')
            .where('request.status = :status', { status: AccountDeletionRequestStatus.Completed })
            .orderBy('request.completedAt', 'DESC')
            .take(limit)
            .getRawMany<{ userId: string }>()

        const failures: Array<{ userId: string; names: string[] }> = []
        for (const { userId } of completedRequests) {
            const failed = (await checkAutoCareDeletionInvariants(AppDataSource, userId))
                .filter(({ count }) => count > 0)
            if (failed.length > 0) {
            failures.push({ userId, names: failed.map(({ name }) => name) })
            }
        }

        if (failures.length > 0) {
            const message = formatRetentionRehearsalReport({ checked: completedRequests.length, failures: failures.length })
            if (json) console.log(JSON.stringify(formatRetentionRehearsalJson({ status: 'blocked', limit, checked: completedRequests.length, failures: failures.length, failedInvariantNames: failures.flatMap(({ names }) => names) }), null, 2))
            throw new Error(message)
        }
        const message = formatRetentionRehearsalReport({ checked: completedRequests.length, failures: 0 })
        if (json) console.log(JSON.stringify(formatRetentionRehearsalJson({ status: 'pass', limit, checked: completedRequests.length, failures: 0 })))
        else console.log(`[account-deletion-retention] PASS: ${message.replace(/^Account deletion retention rehearsal passed: /, '')}`)
        return formatRetentionRehearsalJson({ status: 'pass', limit, checked: completedRequests.length, failures: 0 })
    } finally {
        await AppDataSource.destroy()
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const options = parseRetentionRehearsalOptions()
    runRetentionRehearsal(options).catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : 'Account deletion retention rehearsal failed.')
        process.exitCode = 1
    })
}
