import { describe, expect, it } from 'vitest'

import {
    LEGAL_DOCUMENT_VERSIONS,
    hashConsentEvidence,
} from './user-consent.service.js'

describe('user consent evidence', () => {
    it('uses stable keyed digests and does not expose the source value', () => {
        const first = hashConsentEvidence('203.0.113.10')
        const second = hashConsentEvidence('203.0.113.10')

        expect(first).toHaveLength(64)
        expect(first).toBe(second)
        expect(first).not.toContain('203.0.113.10')
        expect(hashConsentEvidence('203.0.113.11')).not.toBe(first)
        expect(hashConsentEvidence(null)).toBeNull()
    })

    it('keeps document versions explicit until legal approval replaces the draft', () => {
        expect(LEGAL_DOCUMENT_VERSIONS).toEqual({
            terms: 'draft-2026-08-13',
            privacy: 'draft-2026-08-13',
        })
    })
})
