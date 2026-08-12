import { describe, expect, it } from 'vitest'

import {
    MAX_REQUEST_USER_AGENT_LENGTH,
    normalizeRequestHeader,
} from './request-header-policy.js'

describe('request header policy', () => {
    it('removes controls and bounds diagnostic headers', () => {
        expect(normalizeRequestHeader('  browser\nname  ', 64)).toBe('browsername')
        expect(normalizeRequestHeader('x'.repeat(MAX_REQUEST_USER_AGENT_LENGTH + 1), MAX_REQUEST_USER_AGENT_LENGTH))
            .toHaveLength(MAX_REQUEST_USER_AGENT_LENGTH)
    })

    it('maps missing and empty values to null', () => {
        expect(normalizeRequestHeader(undefined, 10)).toBeNull()
        expect(normalizeRequestHeader(' \n ', 10)).toBeNull()
    })
})
