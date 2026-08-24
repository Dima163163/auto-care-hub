import { describe, expect, it } from 'vitest'

import { platformReviewCreateRateLimitOptions } from './platform-reviews.rate-limit.js'

describe('platform review creation rate limit', () => {
    it('uses a dedicated, user-scoped abuse budget instead of sharing generic mutation limits', () => {
        expect(platformReviewCreateRateLimitOptions).toEqual({
            maxRequests: 5,
            scope: 'platform-review:create',
            windowMs: 60 * 60 * 1_000,
        })
    })
})
