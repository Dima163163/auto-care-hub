import { describe, expect, it } from 'vitest'

import {
    MAX_RATE_LIMIT_KEY_LENGTH,
    normalizeRateLimitKey,
} from './rate-limit-keys.js'

describe('rate limit abuse keys', () => {
    it('trims and normalizes case', () => {
        expect(normalizeRateLimitKey(' User@Example.COM ')).toBe('user@example.com')
    })

    it('rejects empty and oversized values', () => {
        expect(normalizeRateLimitKey('   ')).toBeUndefined()
        expect(normalizeRateLimitKey('x'.repeat(MAX_RATE_LIMIT_KEY_LENGTH + 1))).toBeUndefined()
    })
})
