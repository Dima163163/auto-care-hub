import type { FastifyInstance } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import { createRateLimitPreHandler, getAuthenticatedUserRateLimitIdentifier } from '../../shared/security/rate-limit.js'
import { getOptionalIdempotencyKey } from '../../shared/http/idempotency-key.js'
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validate.js'
import { autoCareDiscoveryQuerySchema, autoCareProviderOffersQuerySchema, autoCareProviderParamsSchema, autoCareServiceAttachmentParamsSchema, autoCareServiceRequestParamsSchema, createAutoCareServiceAttachmentSchema, createAutoCareServiceMessageSchema, createAutoCareServiceQuoteSchema, createAutoCareServiceRequestSchema, ownerAutoCareProviderSchema } from './autocare.schemas.js'
import { createOwnerAutoCareProvider, getAutoCareDiscovery, getAutoCareMarkets, getAutoCareProviderOffers, getAutoCareProviderProfile, getAutoCareServiceDefinitions, getOwnerAutoCareProviders } from './autocare.service.js'
import { acceptAutoCareServiceQuote, confirmAutoCareServiceRequest, confirmOwnerAutoCareServiceRequest, createAutoCareServiceAttachment, createAutoCareServiceMessage, createAutoCareServiceQuote, createAutoCareServiceRequest, declineAutoCareServiceQuote, getAutoCareServiceAttachment, getAutoCareServiceRequest, getAutoCareServiceRequestConversation, getMyAutoCareServiceRequests, getOwnerAutoCareServiceRequests } from './autocare-request.service.js'

const serviceRequestRateLimit = createRateLimitPreHandler({ maxRequests: 10, scope: 'autocare:request', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
const serviceRequestTransitionRateLimit = createRateLimitPreHandler({ maxRequests: 30, scope: 'autocare:request-transition', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })

export async function autoCareRoutes(app: FastifyInstance) {
    app.get('/v1/markets', async () => getAutoCareMarkets())
    app.get('/v1/service-definitions', async () => getAutoCareServiceDefinitions())
    app.get('/v1/discovery/providers', async (request) => getAutoCareDiscovery(validateQuery(autoCareDiscoveryQuerySchema, request.query)))
    app.get('/v1/providers/:providerId', async (request) => getAutoCareProviderProfile(validateParams(autoCareProviderParamsSchema, request.params).providerId))
    app.get('/v1/providers/:providerId/offers', async (request) => {
        const params = validateParams(autoCareProviderParamsSchema, request.params)
        const query = validateQuery(autoCareProviderOffersQuerySchema, request.query)
        return getAutoCareProviderOffers(params.providerId, query.serviceId)
    })
    app.get('/owner/autocare-providers', async (request) => getOwnerAutoCareProviders(await requireVerifiedEmail(request)))
    app.post('/owner/autocare-providers', async (request) => createOwnerAutoCareProvider(await requireVerifiedEmail(request), validateBody(ownerAutoCareProviderSchema, request.body)))
    app.post('/v1/service-requests', { preHandler: serviceRequestRateLimit }, async (request) => createAutoCareServiceRequest(await requireVerifiedEmail(request), { ...validateBody(createAutoCareServiceRequestSchema, request.body), idempotencyKey: getOptionalIdempotencyKey(request.headers) }))
    app.get('/v1/service-requests/my', async (request) => getMyAutoCareServiceRequests(await requireAuth(request)))
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
