import { describe, expect, it } from 'vitest'

import {
    canDecideAutoCareModerationEvidence,
    isApprovedAutoCareEvidenceStatus,
    isAutoCareModerationEvidenceKind,
    normalizeAutoCareModerationEvidenceDecision,
    normalizeAutoCareModerationEvidenceStatus,
    normalizeAutoCareModerationEvidenceUuid,
} from './moderation-evidence-policy.js'

describe('AutoCare moderation evidence policy', () => {
    it('allows only a pending item to receive one decision', () => {
        expect(canDecideAutoCareModerationEvidence('pending', 'approved')).toBe(true)
        expect(canDecideAutoCareModerationEvidence('approved', 'rejected')).toBe(false)
    })

    it('limits the evidence queue to supported public moderation subjects', () => {
        expect(isAutoCareModerationEvidenceKind('provider_gallery')).toBe(true)
        expect(isAutoCareModerationEvidenceKind('provider_document')).toBe(true)
        expect(isAutoCareModerationEvidenceKind('registration_document')).toBe(true)
        expect(isAutoCareModerationEvidenceKind('identity_document')).toBe(false)
    })

    it('treats legacy verified and moderated approved evidence as positive trust signals', () => {
        expect(isApprovedAutoCareEvidenceStatus('verified')).toBe(true)
        expect(isApprovedAutoCareEvidenceStatus('approved')).toBe(true)
        expect(isApprovedAutoCareEvidenceStatus('pending')).toBe(false)
        expect(isApprovedAutoCareEvidenceStatus('rejected')).toBe(false)
    })

    it('normalizes a direct admin decision before persistence', () => {
        expect(normalizeAutoCareModerationEvidenceDecision({
            status: 'approved',
            reason: '  Проверка\u00a0документа  ',
        })).toEqual({ status: 'approved', reason: 'Проверка документа' })
    })

    it('rejects malformed decisions and unknown fields at the service boundary', () => {
        expect(normalizeAutoCareModerationEvidenceDecision(null)).toBeNull()
        expect(normalizeAutoCareModerationEvidenceDecision({ status: 'pending', reason: 'ok' })).toBeNull()
        expect(normalizeAutoCareModerationEvidenceDecision({ status: 'rejected', reason: 42 })).toBeNull()
        expect(normalizeAutoCareModerationEvidenceDecision({ status: 'approved', reason: 'ok', extra: true })).toBeNull()
    })

    it('bounds the normalized moderation reason', () => {
        expect(normalizeAutoCareModerationEvidenceDecision({ status: 'approved', reason: '   ' })).toBeNull()
        expect(normalizeAutoCareModerationEvidenceDecision({ status: 'approved', reason: 'x'.repeat(2_001) })).toBeNull()
    })

    it('normalizes and bounds the admin evidence queue status filter', () => {
        expect(normalizeAutoCareModerationEvidenceStatus('  PENDING ')).toBe('pending')
        expect(normalizeAutoCareModerationEvidenceStatus('approved')).toBe('approved')
        expect(normalizeAutoCareModerationEvidenceStatus('verified')).toBeNull()
        expect(normalizeAutoCareModerationEvidenceStatus(null)).toBeNull()
    })

    it('canonicalizes moderation evidence and provider identifiers', () => {
        expect(normalizeAutoCareModerationEvidenceUuid('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeAutoCareModerationEvidenceUuid('not-a-uuid')).toBeNull()
        expect(normalizeAutoCareModerationEvidenceUuid({})).toBeNull()
    })

})
