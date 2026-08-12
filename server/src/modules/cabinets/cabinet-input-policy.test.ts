import { describe, expect, it } from 'vitest'

import { normalizeCabinetTitle } from './cabinet-input-policy.js'

describe('cabinet input policy', () => {
    it('normalizes a bounded title', () => {
        expect(normalizeCabinetTitle('  Quiet\nStudio  ')).toBe('Quiet Studio')
    })

    it('rejects titles outside the service bounds', () => {
        expect(() => normalizeCabinetTitle('A')).toThrow(/invalid/)
        expect(() => normalizeCabinetTitle('x'.repeat(161))).toThrow(/invalid/)
    })
})
