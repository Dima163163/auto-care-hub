import { describe, expect, it } from 'vitest'

import { canDecideAutoCareModerationEvidence, isAutoCareModerationEvidenceKind } from './moderation-evidence-policy.js'

describe('AutoCare moderation evidence policy', () => {
    it('allows only a pending item to receive one decision', () => {
        expect(canDecideAutoCareModerationEvidence('pending', 'approved')).toBe(true)
        expect(canDecideAutoCareModerationEvidence('approved', 'rejected')).toBe(false)
    })

    it('limits the evidence queue to supported public moderation subjects', () => {
        expect(isAutoCareModerationEvidenceKind('provider_gallery')).toBe(true)
        expect(isAutoCareModerationEvidenceKind('identity_document')).toBe(false)
    })
})
