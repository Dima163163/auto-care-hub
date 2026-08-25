import { type RateLimitOptions } from '../../shared/security/rate-limit.js'

export const platformReviewCreateRateLimitOptions = {
    maxRequests: 5,
    scope: 'platform-review:create',
    windowMs: 60 * 60 * 1_000,
} satisfies Omit<RateLimitOptions, 'keyResolvers'>
