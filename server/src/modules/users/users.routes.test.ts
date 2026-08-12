import { describe, expect, it } from 'vitest'

import { getPrivateUserResponseHeaders } from './users.routes.js'

describe('private user response policy', () => {
    it('disables intermediary caching for privacy responses', () => {
        expect(getPrivateUserResponseHeaders()).toEqual({
            'cache-control': 'no-store',
            pragma: 'no-cache',
        })
    })
})
