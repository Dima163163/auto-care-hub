import type { FastifyInstance, FastifyRequest } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import { createRateLimitPreHandler, getAuthenticatedUserRateLimitIdentifier } from '../../shared/security/rate-limit.js'
import { getOptionalIdempotencyKey } from '../../shared/http/idempotency-key.js'
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validate.js'
import { autoCareAvailabilityQuerySchema, autoCareChatParamsSchema, autoCareDiscoveryQuerySchema, autoCareFeaturedReviewsQuerySchema, autoCareLocationZonesQuerySchema, autoCareMarketParamsSchema, autoCareOfferParamsSchema, autoCareProviderOffersQuerySchema, autoCareProviderParamsSchema, autoCareReviewOnlyParamsSchema, autoCareReviewParamsSchema, autoCareServiceAttachmentParamsSchema, autoCareServiceMessageParamsSchema, autoCareServiceRequestParamsSchema, createAutoCareChatSchema, createAutoCareReviewPromoSchema, createAutoCareServiceAttachmentSchema, createAutoCareServiceMessageSchema, createAutoCareServiceOfferSchema, createAutoCareServiceQuoteSchema, createAutoCareServiceRequestSchema, ownerAutoCareProviderSchema, ownerAutoCareReviewsQuerySchema, redeemAutoCareReviewPromoSchema, serviceMessageOfferDecisionSchema, updateAutoCareOfferSchema, updateAutoCareReviewSchema, uploadAutoCareProviderLogoSchema } from './autocare.schemas.js'
import { createOwnerAutoCareProvider, createOwnerAutoCareReviewPromo, getAutoCareDiscovery, getAutoCareLocationZones, getAutoCareMarkets, getAutoCareProviderLogo, getAutoCareProviderOffers, getAutoCareProviderProfile, getAutoCareServiceDefinitions, getFeaturedAutoCareReviews, getMyAutoCareReviews, getOwnerAutoCareProviderReviews, getOwnerAutoCareProviders, getOwnerAutoCareReviews, redeemAutoCareReviewPromo, saveAutoCareProviderLogo, updateClientAutoCareReview, updateOwnerAutoCareOffer } from './autocare.service.js'
import { vehicleCatalogRoutes } from './vehicle-catalog.routes.js'
import { decodeAutoCareProviderLogo } from './autocare-provider-logo-storage.js'
import { acceptAutoCareServiceQuote, confirmAutoCareServiceRequest, confirmOwnerAutoCareServiceRequest, createAutoCareServiceAttachment, createAutoCareServiceMessage, createAutoCareServiceOffer, createAutoCareServiceQuote, createAutoCareServiceRequest, decideAutoCareServiceOffer, declineAutoCareServiceQuote, getAutoCareAvailability, getAutoCareServiceAttachment, getAutoCareServiceRequest, getAutoCareServiceRequestConversation, getMyAutoCareServiceRequests, getOwnerAutoCareServiceRequests, markAutoCareServiceConversationRead } from './autocare-request.service.js'
import { sendServiceChatEvent, subscribeServiceChat } from './service-chat.gateway.js'
import { createAutoCareChat, createAutoCareChatAttachment, createAutoCareChatMessage, getAutoCareChat, getAutoCareChatAttachment, getAutoCareChatThreadForRequest, getMyAutoCareChats, markAutoCareChatRead } from './autocare-chat.service.js'

const serviceRequestRateLimit = createRateLimitPreHandler({ maxRequests: 10, scope: 'autocare:request', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
const serviceRequestTransitionRateLimit = createRateLimitPreHandler({ maxRequests: 30, scope: 'autocare:request-transition', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })

export async function autoCareRoutes(app: FastifyInstance) {
    await app.register(vehicleCatalogRoutes)
    app.get('/v1/markets', async () => getAutoCareMarkets())
    app.get('/v1/markets/:marketId/zones', async (request) => {
        const params = validateParams(autoCareMarketParamsSchema, request.params)
        const query = validateQuery(autoCareLocationZonesQuerySchema, request.query)
        const coordinates = query.latitude !== undefined && query.longitude !== undefined ? { latitude: query.latitude, longitude: query.longitude } : undefined
        return getAutoCareLocationZones(params.marketId, query.parentId, coordinates, query.limit)
    })
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
    app.get('/owner/autocare-reviews', async (request) => getOwnerAutoCareReviews(await requireVerifiedEmail(request), validateQuery(ownerAutoCareReviewsQuerySchema, request.query).providerId))
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
    app.get('/v1/chats', async (request) => getMyAutoCareChats(await requireAuth(request)))
    app.post('/v1/chats', async (request) => createAutoCareChat(await requireVerifiedEmail(request), validateBody(createAutoCareChatSchema, request.body)))
    app.get('/v1/service-requests/:requestId/chat-thread', async (request) => getAutoCareChatThreadForRequest(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.get('/v1/chats/:chatId', async (request) => getAutoCareChat(await requireAuth(request), validateParams(autoCareChatParamsSchema, request.params).chatId))
    app.post('/v1/chats/:chatId/messages', { preHandler: serviceRequestTransitionRateLimit }, async (request) => createAutoCareChatMessage(await requireVerifiedEmail(request), validateParams(autoCareChatParamsSchema, request.params).chatId, validateBody(createAutoCareServiceMessageSchema, request.body)))
    app.post('/v1/chats/:chatId/read', async (request) => markAutoCareChatRead(await requireAuth(request), validateParams(autoCareChatParamsSchema, request.params).chatId))
    app.post('/v1/chats/:chatId/attachments', { preHandler: serviceRequestTransitionRateLimit, bodyLimit: 14 * 1024 * 1024 }, async (request) => createAutoCareChatAttachment(await requireVerifiedEmail(request), validateParams(autoCareChatParamsSchema, request.params).chatId, validateBody(createAutoCareServiceAttachmentSchema, request.body)))
    app.get('/v1/chats/:chatId/attachments/:attachmentId', async (request, reply) => {
        const params = validateParams(autoCareChatParamsSchema.extend({ attachmentId: autoCareServiceAttachmentParamsSchema.shape.attachmentId }), request.params)
        const attachment = await getAutoCareChatAttachment(await requireAuth(request), params.chatId, params.attachmentId)
        return reply.type(attachment.contentType).send(attachment.content)
    })
    app.get('/v1/chats/:chatId/ws', { websocket: true }, async (socket, request) => {
        try {
            const token = typeof request.query === 'object' && request.query !== null && 'accessToken' in request.query
                ? String((request.query as { accessToken?: unknown }).accessToken ?? '')
                : ''
            const authRequest = token
                ? { ...request, headers: { ...request.headers, authorization: `Bearer ${token}` } } as FastifyRequest
                : request
            const user = await requireAuth(authRequest)
            const chatId = validateParams(autoCareChatParamsSchema, request.params).chatId
            await getAutoCareChat(user, chatId)
            const unsubscribe = subscribeServiceChat(chatId, socket)
            sendServiceChatEvent(socket, { type: 'presence', threadId: chatId, payload: { connected: true } })
            socket.on('message', (raw) => {
                try {
                    const event = JSON.parse(raw.toString()) as { type?: unknown }
                    if (event.type === 'ping') sendServiceChatEvent(socket, { type: 'presence', threadId: chatId, payload: { pong: true } })
                    if (event.type === 'read') void markAutoCareChatRead(user, chatId)
                } catch {
                    socket.send(JSON.stringify({ type: 'presence', threadId: chatId, payload: { error: 'Invalid chat event.' } }))
                }
            })
            socket.on('close', unsubscribe)
            socket.on('error', unsubscribe)
        } catch {
            socket.close(4401, 'Unauthorized')
        }
    })
    app.get('/v1/autocare-reviews/my', async (request) => getMyAutoCareReviews(await requireAuth(request)))
    app.post('/v1/autocare-review-promos/redeem', async (request) => redeemAutoCareReviewPromo(await requireVerifiedEmail(request), validateBody(redeemAutoCareReviewPromoSchema, request.body)))
    app.patch('/v1/autocare-reviews/:reviewId', async (request) => {
        const params = validateParams(autoCareReviewOnlyParamsSchema, request.params)
        return updateClientAutoCareReview(await requireVerifiedEmail(request), params.reviewId, validateBody(updateAutoCareReviewSchema, request.body))
    })
    app.get('/v1/service-requests/:requestId', async (request) => getAutoCareServiceRequest(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.get('/v1/service-requests/:requestId/conversation', async (request) => getAutoCareServiceRequestConversation(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/v1/service-requests/:requestId/messages', { preHandler: serviceRequestTransitionRateLimit }, async (request) => createAutoCareServiceMessage(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(createAutoCareServiceMessageSchema, request.body)))
    app.post('/v1/service-requests/:requestId/read', async (request) => markAutoCareServiceConversationRead(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/owner/service-requests/:requestId/offers', { preHandler: serviceRequestTransitionRateLimit }, async (request) => createAutoCareServiceOffer(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(createAutoCareServiceOfferSchema, request.body)))
    app.post('/v1/service-requests/:requestId/offers/:messageId/decision', { preHandler: serviceRequestTransitionRateLimit }, async (request) => {
        const params = validateParams(autoCareServiceMessageParamsSchema, request.params)
        return decideAutoCareServiceOffer(await requireVerifiedEmail(request), params.requestId, params.messageId, validateBody(serviceMessageOfferDecisionSchema, request.body).decision)
    })
    app.get('/v1/service-requests/:requestId/ws', { websocket: true }, async (socket, request) => {
        try {
            const token = typeof request.query === 'object' && request.query !== null && 'accessToken' in request.query
                ? String((request.query as { accessToken?: unknown }).accessToken ?? '')
                : ''
            const authRequest = token
                ? { ...request, headers: { ...request.headers, authorization: `Bearer ${token}` } } as FastifyRequest
                : request
            const user = await requireAuth(authRequest)
            const requestId = validateParams(autoCareServiceRequestParamsSchema, request.params).requestId
            await getAutoCareServiceRequest(user, requestId)
            const unsubscribe = subscribeServiceChat(requestId, socket)
            sendServiceChatEvent(socket, { type: 'presence', requestId, payload: { connected: true } })
            socket.on('message', (raw) => {
                try {
                    const event = JSON.parse(raw.toString()) as { type?: unknown }
                    if (event.type === 'ping') sendServiceChatEvent(socket, { type: 'presence', requestId, payload: { pong: true } })
                    if (event.type === 'read') void markAutoCareServiceConversationRead(user, requestId)
                } catch {
                    socket.send(JSON.stringify({ type: 'presence', requestId, payload: { error: 'Invalid chat event.' } }))
                }
            })
            socket.on('close', unsubscribe)
            socket.on('error', unsubscribe)
        } catch {
            socket.close(4401, 'Unauthorized')
        }
    })
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
