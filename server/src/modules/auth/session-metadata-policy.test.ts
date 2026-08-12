import { describe, expect, it } from 'vitest'

import { normalizeStoredSessionValue } from './session-metadata-policy.js'

describe('stored session metadata policy', () => {
    it('removes control characters and collapses whitespace', () => {
        expect(normalizeStoredSessionValue('  Browser\tName\n 1  ')).toBe('Browser Name 1')
        expect(normalizeStoredSessionValue('\u0000')).toBe(null)
        expect(normalizeStoredSessionValue(null)).toBe(null)
    })
})
