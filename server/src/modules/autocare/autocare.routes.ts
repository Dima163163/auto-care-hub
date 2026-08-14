import type { FastifyInstance } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import { createRateLimitPreHandler, getAuthenticatedUserRateLimitIdentifier } from '../../shared/security/rate-limit.js'
import { getOptionalIdempotencyKey } from '../../shared/http/idempotency-key.js'
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validate.js'
import { autoCareAvailabilityQuerySchema, autoCareDiscoveryQuerySchema, autoCareFeaturedReviewsQuerySchema, autoCareOfferParamsSchema, autoCareProviderOffersQuerySchema, autoCareProviderParamsSchema, autoCareReviewOnlyParamsSchema, autoCareReviewParamsSchema, autoCareServiceAttachmentParamsSchema, autoCareServiceRequestParamsSchema, createAutoCareReviewPromoSchema, createAutoCareServiceAttachmentSchema, createAutoCareServiceMessageSchema, createAutoCareServiceQuoteSchema, createAutoCareServiceRequestSchema, ownerAutoCareProviderSchema, redeemAutoCareReviewPromoSchema, updateAutoCareOfferSchema, updateAutoCareReviewSchema, uploadAutoCareProviderLogoSchema } from './autocare.schemas.js'
import { createOwnerAutoCareProvider, createOwnerAutoCareReviewPromo, getAutoCareDiscovery, getAutoCareMarkets, getAutoCareProviderLogo, getAutoCareProviderOffers, getAutoCareProviderProfile, getAutoCareServiceDefinitions, getFeaturedAutoCareReviews, getMyAutoCareReviews, getOwnerAutoCareProviderReviews, getOwnerAutoCareProviders, redeemAutoCareReviewPromo, saveAutoCareProviderLogo, updateClientAutoCareReview, updateOwnerAutoCareOffer } from './autocare.service.js'
import { vehicleCatalogRoutes } from './vehicle-catalog.routes.js'
import { decodeAutoCareProviderLogo } from './autocare-provider-logo-storage.js'
import { acceptAutoCareServiceQuote, confirmAutoCareServiceRequest, confirmOwnerAutoCareServiceRequest, createAutoCareServiceAttachment, createAutoCareServiceMessage, createAutoCareServiceQuote, createAutoCareServiceRequest, declineAutoCareServiceQuote, getAutoCareAvailability, getAutoCareServiceAttachment, getAutoCareServiceRequest, getAutoCareServiceRequestConversation, getMyAutoCareServiceRequests, getOwnerAutoCareServiceRequests } from './autocare-request.service.js'

const serviceRequestRateLimit = createRateLimitPreHandler({ maxRequests: 10, scope: 'autocare:request', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
const serviceRequestTransitionRateLimit = createRateLimitPreHandler({ maxRequests: 30, scope: 'autocare:request-transition', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })

export async function autoCareRoutes(app: FastifyInstance) {
    await app.register(vehicleCatalogRoutes)
    app.get('/v1/markets', async () => getAutoCareMarkets())
    app.get('/v1/service-definitions', async () => getAutoCareServiceDefinitions())
    app.get('/v1/reviews/featured', async (request) => getFeaturedAutoCareReviews(validateQuery(autoCareFeaturedReviewsQuerySchema, request.query).limit))
    app.get('/uploads/autocare/logos/:fileName', async (request, reply) => {
        const logo = await getAutoCareProviderLogo(String((request.params as { fileName: string }).fileName))
        return reply.header('cache-control', 'public, max-age=31536000, immutable').type('image/webp').send(logo)
    })
    app.get('/v1/discovery/providers', async (request) => getAutoCareDiscovery(validateQuery(autoCareDiscoveryQuerySchema, request.query)))
    app.get('/v1/providers/:providerId', async (request) => getAutoCareProviderProfile(validateParams(autoCareProviderParamsSchema, request.params).providerId))
    app.get('/v1/providers/:providerId/availability', async (request) => {
        const params = validateParams(autoCareProviderParamsSchema, request.params)
        const query = validateQuery(autoCareAvailabilityQuerySchema, request.query)
        return getAutoCareAvailability(params.providerId, query.locationId, query.offeringId, query.date)
    })
    app.get('/v1/providers/:providerId/offers', async (request) => {
        const params = validateParams(autoCareProviderParamsSchema, request.params)
        const query = validateQuery(autoCareProviderOffersQuerySchema, request.query)
        return getAutoCareProviderOffers(params.providerId, query.serviceId)
    })
    app.get('/owner/autocare-providers', async (request) => getOwnerAutoCareProviders(await requireVerifiedEmail(request)))
    app.patch('/owner/autocare-providers/:providerId/offers/:offerId', async (request) => {
        const params = validateParams(autoCareOfferParamsSchema, request.params)
        const body = validateBody(updateAutoCareOfferSchema, request.body)
        return updateOwnerAutoCareOffer(await requireVerifiedEmail(request), params.providerId, params.offerId, body)
    })
    app.get('/owner/autocare-providers/:providerId/reviews', async (request) => {
        const params = validateParams(autoCareProviderParamsSchema, request.params)
        return getOwnerAutoCareProviderReviews(await requireVerifiedEmail(request), params.providerId)
    })
    app.post('/owner/autocare-providers/:providerId/reviews/:reviewId/promos', async (request) => {
        const params = validateParams(autoCareReviewParamsSchema, request.params)
        return createOwnerAutoCareReviewPromo(await requireVerifiedEmail(request), params.providerId, params.reviewId, validateBody(createAutoCareReviewPromoSchema, request.body))
    })
    app.post('/owner/autocare-providers/logo', { bodyLimit: 1_500_000 }, async (request) => {
        const body = validateBody(uploadAutoCareProviderLogoSchema, request.body)
        return saveAutoCareProviderLogo(await requireVerifiedEmail(request), decodeAutoCareProviderLogo(body.contentBase64))
    })
    app.post('/owner/autocare-providers', async (request) => createOwnerAutoCareProvider(await requireVerifiedEmail(request), validateBody(ownerAutoCareProviderSchema, request.body)))
    app.post('/v1/service-requests', { preHandler: serviceRequestRateLimit }, async (request) => createAutoCareServiceRequest(await requireVerifiedEmail(request), { ...validateBody(createAutoCareServiceRequestSchema, request.body), idempotencyKey: getOptionalIdempotencyKey(request.headers) }))
    app.get('/v1/service-requests/my', async (request) => getMyAutoCareServiceRequests(await requireAuth(request)))
    app.get('/v1/autocare-reviews/my', async (request) => getMyAutoCareReviews(await requireAuth(request)))
    app.post('/v1/autocare-review-promos/redeem', async (request) => redeemAutoCareReviewPromo(await requireVerifiedEmail(request), validateBody(redeemAutoCareReviewPromoSchema, request.body)))
    app.patch('/v1/autocare-reviews/:reviewId', async (request) => {
        const params = validateParams(autoCareReviewOnlyParamsSchema, request.params)
        return updateClientAutoCareReview(await requireVerifiedEmail(request), params.reviewId, validateBody(updateAutoCareReviewSchema, request.body))
    })
    app.get('/v1/service-requests/:requestId', async (request) => getAutoCareServiceRequest(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.get('/v1/service-requests/:requestId/conversation', async (request) => getAutoCareServiceRequestConversation(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/v1/service-requests/:requestId/messages', { preHandler: serviceRequestTransitionRateLimit }, async (request) => createAutoCareServiceMessage(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(createAutoCareServiceMessageSchema, request.body)))
    app.post('/v1/service-requests/:requestId/attachments', { preHandler: serviceRequestTransitionRateLimit, bodyLimit: 14 * 1024 * 1024 }, async (request) => createAutoCareServiceAttachment(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(createAutoCareServiceAttachmentSchema, request.body)))
    app.get('/v1/service-requests/:requestId/attachments/:attachmentId', async (request, reply) => {
        const params = validateParams(autoCareServiceAttachmentParamsSchema, request.params)
        const attachment = await getAutoCareServiceAttachment(await requireAuth(request), params.requestId, params.attachmentId)
        return reply.type(attachment.contentType).send(attachment.content)
    })
    app.post('/v1/service-requests/:requestId/confirm', { preHandler: serviceRequestTransitionRateLimit }, async (request) => confirmAutoCareServiceRequest(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/v1/service-requests/:requestId/quote/accept', { preHandler: serviceRequestTransitionRateLimit }, async (request) => acceptAutoCareServiceQuote(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/v1/service-requests/:requestId/quote/decline', { preHandler: serviceRequestTransitionRateLimit }, async (request) => declineAutoCareServiceQuote(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.get('/owner/service-requests', async (request) => getOwnerAutoCareServiceRequests(await requireAuth(request)))
    app.post('/owner/service-requests/:requestId/confirm', { preHandler: serviceRequestTransitionRateLimit }, async (request) => confirmOwnerAutoCareServiceRequest(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/owner/service-requests/:requestId/quote', { preHandler: serviceRequestTransitionRateLimit }, async (request) => createAutoCareServiceQuote(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(createAutoCareServiceQuoteSchema, request.body)))
}
