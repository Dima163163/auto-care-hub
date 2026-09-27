import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { requireAuth } from '../auth/require-auth.js'
import { createRateLimitPreHandler, getAuthenticatedUserRateLimitIdentifier } from '../../shared/security/rate-limit.js'
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validate.js'
import { getMyAutoCareCommunityProfile, getPublicAutoCareCommunityProfile, getMyAutoCareHelpfulReviewIds, markAutoCareReviewHelpful, removeAutoCareReviewHelpfulVote, updateMyAutoCareCommunityProfile } from './autocare-community.service.js'

const profileParamsSchema = z.object({ profileId: z.string().uuid() })
const reviewParamsSchema = z.object({ reviewId: z.string().uuid() })
const providerQuerySchema = z.object({ providerId: z.string().uuid() })
const updateProfileSchema = z.object({
    enabled: z.boolean().optional(),
    displayName: z.string().max(100).nullable().optional(),
}).strict().refine((value) => value.enabled !== undefined || value.displayName !== undefined)

const profileReadRateLimit = createRateLimitPreHandler({ maxRequests: 60, scope: 'community:profile-read', windowMs: 60_000 })
const privateProfileRateLimit = createRateLimitPreHandler({ maxRequests: 20, scope: 'community:profile-write', windowMs: 60_000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
const communityVoteRateLimit = createRateLimitPreHandler({ maxRequests: 30, scope: 'community:review-vote', windowMs: 60_000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })

function privateHeaders() {
    return { 'cache-control': 'no-store', pragma: 'no-cache' } as const
}

export async function autoCareCommunityRoutes(app: FastifyInstance) {
    app.get('/v1/community/clients/:profileId', { preHandler: profileReadRateLimit }, async (request, reply) => {
        const { profileId } = validateParams(profileParamsSchema, request.params)
        const profile = await getPublicAutoCareCommunityProfile(profileId)
        return reply.headers({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' }).send(profile)
    })

    app.get('/users/me/community-profile', { preHandler: profileReadRateLimit }, async (request, reply) => {
        const user = await requireAuth(request)
        return reply.headers(privateHeaders()).send(await getMyAutoCareCommunityProfile(user))
    })

    app.patch('/users/me/community-profile', { preHandler: privateProfileRateLimit }, async (request, reply) => {
        const user = await requireAuth(request)
        const body = validateBody(updateProfileSchema, request.body)
        return reply.headers(privateHeaders()).send(await updateMyAutoCareCommunityProfile(user, body, request))
    })

    app.get('/v1/autocare-reviews/helpful/my', { preHandler: communityVoteRateLimit }, async (request, reply) => {
        const user = await requireAuth(request)
        const { providerId } = validateQuery(providerQuerySchema, request.query)
        return reply.headers(privateHeaders()).send(await getMyAutoCareHelpfulReviewIds(user, providerId))
    })

    app.put('/v1/autocare-reviews/:reviewId/helpful', { preHandler: communityVoteRateLimit }, async (request, reply) => {
        const user = await requireAuth(request)
        const { reviewId } = validateParams(reviewParamsSchema, request.params)
        return reply.headers(privateHeaders()).send(await markAutoCareReviewHelpful(user, reviewId))
    })

    app.delete('/v1/autocare-reviews/:reviewId/helpful', { preHandler: communityVoteRateLimit }, async (request, reply) => {
        const user = await requireAuth(request)
        const { reviewId } = validateParams(reviewParamsSchema, request.params)
        return reply.headers(privateHeaders()).send(await removeAutoCareReviewHelpfulVote(user, reviewId))
    })
}
