import { describe, expect, it } from 'vitest'

import { getPublicAuthError } from './auth-error-contract.js'

describe('public auth error contract', () => {
    it('keeps authentication failures neutral by status', () => {
        expect(getPublicAuthError(401)).toEqual({ code: 'unauthorized', message: 'Authentication is required.' })
        expect(getPublicAuthError(403).code).toBe('forbidden')
        expect(getPublicAuthError(422).code).toBe('bad_request')
    })
})
