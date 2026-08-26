import { describe, expect, it } from 'vitest'

import { canDecideAutoCareModerationEvidence, isApprovedAutoCareEvidenceStatus, isAutoCareModerationEvidenceKind } from './moderation-evidence-policy.js'

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
})
