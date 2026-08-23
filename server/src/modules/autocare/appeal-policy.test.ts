import { describe, expect, it } from 'vitest'

import { canTransitionAppeal, validateAppealInput } from './appeal-policy.js'

describe('appeal policy', () => {
    it('normalizes reasons and caps evidence references', () => {
        const result = validateAppealInput({ subject: 'provider', reason: '  This is a sufficiently detailed appeal reason.  ', evidenceIds: ['a', 'a', ...Array.from({ length: 30 }, (_, index) => `e-${index}`)] })
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.reason).toMatch(/^This/)
            expect(result.value.evidenceIds).toHaveLength(20)
        }
    })

    it('rejects short reasons and terminal transitions', () => {
        expect(validateAppealInput({ subject: 'review', reason: 'too short' }).ok).toBe(false)
        expect(canTransitionAppeal('pending', 'accepted')).toBe(true)
        expect(canTransitionAppeal('accepted', 'rejected')).toBe(false)
    })
})
