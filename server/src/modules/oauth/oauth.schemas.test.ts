import { describe, expect, it } from 'vitest'

import { oauthAuthorizationQuerySchema } from './oauth.schemas.js'

describe('OAuth authorization consent query', () => {
    it('accepts explicit false flags for login flows', () => {
        expect(oauthAuthorizationQuerySchema.parse({
            termsAccepted: 'false',
            privacyAccepted: 'false',
        })).toEqual({
            termsAccepted: 'false',
            privacyAccepted: 'false',
        })
    })

    it('accepts only the supported boolean string values', () => {
        expect(oauthAuthorizationQuerySchema.safeParse({ termsAccepted: 'yes' }).success).toBe(false)
        expect(oauthAuthorizationQuerySchema.parse({
            termsAccepted: 'true',
            privacyAccepted: 'true',
        })).toEqual({
            termsAccepted: 'true',
            privacyAccepted: 'true',
        })
    })
})
