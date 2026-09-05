import { describe, expect, it } from 'vitest'

import { canTransitionAppeal, isPostgresUniqueViolation, normalizeAdminAutoCareAppealsQuery, normalizeAppealUuid, validateAppealDecisionInput, validateAppealInput } from './appeal-policy.js'

describe('appeal policy', () => {
    it('normalizes reasons and deduplicates valid evidence references', () => {
        const result = validateAppealInput({ subject: 'provider', reason: '  This is a sufficiently detailed appeal reason.  ', evidenceIds: ['11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'] })
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.reason).toMatch(/^This/)
            expect(result.value.evidenceIds).toEqual(['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'])
        }
    })

    it('rejects short reasons and terminal transitions', () => {
        expect(validateAppealInput({ subject: 'review', reason: 'too short' }).ok).toBe(false)
        expect(validateAppealInput({ subject: 'review', reason: 'This reason is long enough to pass.', evidenceIds: ['not-a-uuid'] }).ok).toBe(false)
        expect(validateAppealInput({ subject: 'review', reason: 'This reason is long enough to pass.', evidenceIds: Array.from({ length: 21 }, () => '11111111-1111-4111-8111-111111111111') }).ok).toBe(false)
        expect(validateAppealInput({ subject: 'review', reason: 'This reason is long enough to pass.', unknown: true }).ok).toBe(false)
        expect(canTransitionAppeal('pending', 'accepted')).toBe(true)
        expect(canTransitionAppeal('accepted', 'rejected')).toBe(false)
    })

    it('normalizes appeal references and admin decisions without throwing on malformed input', () => {
        expect(normalizeAppealUuid('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeAppealUuid({})).toBeNull()
        expect(validateAppealDecisionInput({ status: 'accepted', reason: '  Decision is supported by the submitted evidence.  ' })).toEqual({ ok: true, value: { status: 'accepted', reason: 'Decision is supported by the submitted evidence.' } })
        expect(validateAppealDecisionInput({ status: 'pending', reason: 'invalid' }).ok).toBe(false)
        expect(validateAppealDecisionInput({ status: 'accepted', reason: 42 }).ok).toBe(false)
        expect(validateAppealDecisionInput({ status: 'accepted', reason: 'Decision is supported by the submitted evidence.', unknown: true }).ok).toBe(false)
    })

    it('recognizes only PostgreSQL unique-index conflicts', () => {
        expect(isPostgresUniqueViolation({ code: '23505' })).toBe(true)
        expect(isPostgresUniqueViolation({ code: '23503' })).toBe(false)
        expect(isPostgresUniqueViolation(new Error('duplicate'))).toBe(false)
    })

    it('bounds and enum-checks direct admin appeal list queries', () => {
        expect(normalizeAdminAutoCareAppealsQuery({ status: 'pending', subject: 'provider', limit: 25, cursor: 'opaque-cursor' })).toEqual({ status: 'pending', subject: 'provider', limit: 25 })
        expect(normalizeAdminAutoCareAppealsQuery(undefined)).toEqual({ limit: 50 })
        expect(normalizeAdminAutoCareAppealsQuery({ status: 'unknown' })).toBeNull()
        expect(normalizeAdminAutoCareAppealsQuery({ limit: 101 })).toBeNull()
        expect(normalizeAdminAutoCareAppealsQuery({ limit: '25' })).toBeNull()
        expect(normalizeAdminAutoCareAppealsQuery({ extra: true })).toBeNull()
    })
})
