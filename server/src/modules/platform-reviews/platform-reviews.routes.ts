import type { FastifyInstance } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validate.js'
import { createRateLimitPreHandler, getAuthenticatedUserRateLimitIdentifier } from '../../shared/security/rate-limit.js'
import { recordAuditLog } from '../admin/audit-log.service.js'
import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import { createPlatformReviewSchema, platformReviewParamsSchema, platformReviewsQuerySchema, respondPlatformReviewSchema } from './platform-reviews.schemas.js'
import { createPlatformReview, deletePlatformReview, getAdminPlatformReviews, getMyPlatformReviews, getPublicPlatformReviews, respondToPlatformReview } from './platform-reviews.service.js'
import { platformReviewCreateRateLimitOptions } from './platform-reviews.rate-limit.js'

export async function platformReviewsRoutes(app: FastifyInstance) {
    const createPlatformReviewRateLimit = createRateLimitPreHandler({ ...platformReviewCreateRateLimitOptions, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
    app.get('/v1/platform-reviews', async (request) => getPublicPlatformReviews(validateQuery(platformReviewsQuerySchema, request.query).limit))
    app.post('/v1/platform-reviews', { preHandler: createPlatformReviewRateLimit }, async (request) => createPlatformReview(await requireVerifiedEmail(request), validateBody(createPlatformReviewSchema, request.body)))
    app.get('/v1/platform-reviews/my', async (request) => getMyPlatformReviews(await requireAuth(request)))
    app.get('/admin/platform-reviews', async (request) => getAdminPlatformReviews(await requireAuth(request)))
    app.post('/admin/platform-reviews/:reviewId/response', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(platformReviewParamsSchema, request.params)
        const result = await respondToPlatformReview(user, params.reviewId, validateBody(respondPlatformReviewSchema, request.body))
        await recordAuditLog({ actorId: user.id, action: AuditAction.ReviewModerated, targetId: params.reviewId, targetType: 'platform_review', metadata: { responseAdded: true }, request })
        return result
    })
    app.delete('/super-admin/platform-reviews/:reviewId', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(platformReviewParamsSchema, request.params)
        const result = await deletePlatformReview(user, params.reviewId)
        await recordAuditLog({ actorId: user.id, action: AuditAction.ReviewDeleted, targetId: params.reviewId, targetType: 'platform_review', metadata: { reason: 'moderation' }, request })
        return result
    })
}
