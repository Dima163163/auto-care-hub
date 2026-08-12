import { describe, expect, it } from 'vitest'

import { getStartupFailureGuidance } from './startup-failure-policy.js'

describe('startup failure guidance', () => {
    it('guides schema failures to the release migration command', () => {
        expect(getStartupFailureGuidance(new Error(
            'Database schema contract is incomplete: bookings.idempotency_key',
        ))).toBe('Run `npm --prefix server run schema:check`, then `npm --prefix server run release:migrate` before restarting the web process.')
    })

    it('guides database connection failures without exposing connection details', () => {
        expect(getStartupFailureGuidance(new Error(
            'AggregateError: connect ECONNREFUSED postgres.internal:5432',
        ))).toBe('Verify that PostgreSQL is reachable and the configured database connection is available.')
    })

    it('finds database connection failures in aggregate causes', () => {
        expect(getStartupFailureGuidance(new AggregateError([
            new Error('connect ECONNREFUSED ::1:5433'),
            new Error('connect ECONNREFUSED 127.0.0.1:5433'),
        ]))).toBe('Verify that PostgreSQL is reachable and the configured database connection is available.')
    })

    it('guides missing production secrets without exposing their values', () => {
        expect(getStartupFailureGuidance(new Error(
            'OUTBOX_TOKEN_ENCRYPTION_KEY is required in production.',
        ))).toBe('Configure the required production secrets in the deployment environment, then restart the web process. Never place secret values in tracked files.')
        expect(getStartupFailureGuidance(new Error(
            'Production requires a live Stripe secret key.',
        ))).toBe('Configure the required production secrets in the deployment environment, then restart the web process. Never place secret values in tracked files.')
    })

    it('does not invent guidance for unrelated failures', () => {
        expect(getStartupFailureGuidance(new Error('Unexpected config failure'))).toBeNull()
        expect(getStartupFailureGuidance('failure')).toBeNull()
    })
})
