import type { FastifyInstance } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import {
    validateBody,
    validateParams,
} from '../../shared/validation/validate.js'
import {
    cabinetReviewParamsSchema,
    createReviewSchema,
    reviewParamsSchema,
    updateReviewStatusSchema,
} from './reviews.schemas.js'
import {
    createCabinetReview,
    deleteAdminReview,
    getAdminReviews,
    getClientReviewByCabinetId,
    getClientReviews,
    getPublicReviewsByCabinetId,
    updateAdminReviewStatus,
    updateClientReview,
} from './reviews.service.js'
import { recordAuditLog } from '../admin/audit-log.service.js'
import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import type { AdminReview, ClientReview, PublicReview } from './reviews.types.js'
import {
    createRateLimitPreHandler,
    getAuthenticatedUserRateLimitIdentifier,
} from '../../shared/security/rate-limit.js'

type PublicReviewsResponse = PublicReview[]
type PublicReviewResponse = PublicReview
type ClientReviewResponse = PublicReview | null
type ClientReviewsResponse = ClientReview[]
type AdminReviewsResponse = AdminReview[]
type AdminReviewResponse = AdminReview
type DeleteReviewResponse = {
    success: true
}

const createReviewRateLimit = createRateLimitPreHandler({
    maxRequests: 5,
    scope: 'review:create',
    windowMs: 60 * 1000,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

export async function reviewsRoutes(app: FastifyInstance) {
    app.get<{ Params: unknown; Reply: PublicReviewsResponse }>(
        '/cabinets/:id/reviews',
        async (request) => {
            const params = validateParams(cabinetReviewParamsSchema, request.params)

            return getPublicReviewsByCabinetId(params.id)
        }
    )

    app.post<{ Params: unknown; Body: unknown; Reply: PublicReviewResponse }>(
        '/cabinets/:id/reviews',
        {
            preHandler: createReviewRateLimit,
        },
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(cabinetReviewParamsSchema, request.params)
            const body = validateBody(createReviewSchema, request.body)

            return createCabinetReview(user, params.id, body)
        }
    )

    app.get<{ Params: unknown; Reply: ClientReviewResponse }>(
        '/cabinets/:id/reviews/my',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(cabinetReviewParamsSchema, request.params)

            return getClientReviewByCabinetId(user, params.id)
        }
    )

    app.get<{ Reply: ClientReviewsResponse }>(
        '/reviews/my',
        async (request) => {
            const user = await requireAuth(request)

            return getClientReviews(user)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: PublicReviewResponse }>(
        '/reviews/:id',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(reviewParamsSchema, request.params)
            const body = validateBody(createReviewSchema, request.body)

            return updateClientReview(user, params.id, body)
        }
    )

    app.get<{ Reply: AdminReviewsResponse }>(
        '/admin/reviews',
        async (request) => {
            const user = await requireAuth(request)

            return getAdminReviews(user)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: AdminReviewResponse }>(
        '/admin/reviews/:id/status',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(reviewParamsSchema, request.params)
            const body = validateBody(updateReviewStatusSchema, request.body)

            const result = await updateAdminReviewStatus(user, params.id, body.status)

            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.ReviewModerated,
                targetId: params.id,
                targetType: 'review',
                metadata: {
                    oldStatus: result.oldStatus,
                    newStatus: result.newStatus,
                },
                request,
            })

            return result.review
        }
    )

    app.delete<{ Params: unknown; Reply: DeleteReviewResponse }>(
        '/admin/reviews/:id',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(reviewParamsSchema, request.params)

            const result = await deleteAdminReview(user, params.id)

            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.ReviewDeleted,
                targetId: params.id,
                targetType: 'review',
                metadata: result.reviewData,
                request,
            })

            return {
                success: true,
            }
        }
    )
}
