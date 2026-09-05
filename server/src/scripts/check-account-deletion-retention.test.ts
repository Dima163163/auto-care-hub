import { describe, expect, it } from 'vitest'

import {
    DEFAULT_RETENTION_REHEARSAL_LIMIT,
    formatRetentionRehearsalJson,
    formatRetentionRehearsalReport,
    MAX_RETENTION_REHEARSAL_LIMIT,
    parseRetentionRehearsalLimit,
    parseRetentionRehearsalOptions,
    runRetentionRehearsal,
} from './check-account-deletion-retention.js'

describe('account deletion retention rehearsal options', () => {
    it('uses a bounded default and accepts an explicit limit', () => {
        expect(parseRetentionRehearsalLimit([])).toBe(DEFAULT_RETENTION_REHEARSAL_LIMIT)
        expect(parseRetentionRehearsalLimit(['--limit', '25'])).toBe(25)
        expect(parseRetentionRehearsalLimit(['--limit', String(MAX_RETENTION_REHEARSAL_LIMIT)])).toBe(MAX_RETENTION_REHEARSAL_LIMIT)
    })

    it('rejects missing, fractional, zero and oversized limits', () => {
        for (const args of [['--limit'], ['--limit', '1.5'], ['--limit', '0'], ['--limit', String(MAX_RETENTION_REHEARSAL_LIMIT + 1)]]) {
            expect(() => parseRetentionRehearsalLimit(args)).toThrow(/--limit must be an integer/)
        }
    })

    it('formats pass and blocked summaries without exposing identifiers', () => {
        expect(formatRetentionRehearsalReport({ checked: 3, failures: 0 })).toContain('passed')
        expect(formatRetentionRehearsalReport({ checked: 3, failures: 1 })).toContain('blocked')
        expect(formatRetentionRehearsalReport({ checked: 3, failures: 1 })).not.toContain('userId')
    })

    it('supports a deterministic dry-run JSON report without opening the database', async () => {
        expect(parseRetentionRehearsalOptions(['--limit', '7', '--dry-run', '--json'])).toEqual({ limit: 7, dryRun: true, json: true })
        expect(formatRetentionRehearsalJson({ status: 'dry-run', limit: 7, checked: 0, failures: 0 })).toEqual({ schemaVersion: 1, status: 'dry-run', limit: 7, checked: 0, failures: 0, failedInvariantNames: [] })
        await expect(runRetentionRehearsal({ limit: 7, dryRun: true, json: false })).resolves.toMatchObject({ status: 'dry-run', limit: 7, checked: 0, failures: 0 })
    })

    it('redacts user identifiers from blocked JSON summaries', () => {
        const report = formatRetentionRehearsalJson({ status: 'blocked', limit: 3, checked: 3, failures: 1, failedInvariantNames: ['account-related outbox user payloads are redacted'] })
        expect(JSON.stringify(report)).not.toContain('userId')
        expect(report.failedInvariantNames).toEqual(['account-related outbox user payloads are redacted'])
    })
})
