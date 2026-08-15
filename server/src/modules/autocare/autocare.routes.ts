import type { FastifyInstance, FastifyRequest } from 'fastify'

import { env } from '../../config/env.js'
import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import { createRateLimitPreHandler, getAuthenticatedUserRateLimitIdentifier } from '../../shared/security/rate-limit.js'
import { getOptionalIdempotencyKey } from '../../shared/http/idempotency-key.js'
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validate.js'
import { autoCareAvailabilityQuerySchema, autoCareBroadcastParamsSchema, autoCareChatParamsSchema, autoCareDiscoveryQuerySchema, autoCareFairPriceQuerySchema, autoCareFeaturedReviewsQuerySchema, autoCareFavoriteParamsSchema, autoCareFleetParamsSchema, autoCareLocationZonesQuerySchema, autoCareMarketParamsSchema, autoCareOfferParamsSchema, autoCareProviderOffersQuerySchema, autoCareProviderParamsSchema, autoCareReviewOnlyParamsSchema, autoCareReviewParamsSchema, autoCareServiceAttachmentParamsSchema, autoCareServiceMessageParamsSchema, autoCareServiceRequestParamsSchema, cancelAutoCareServiceRequestSchema, completeAutoCareServiceRequestSchema, createAutoCareBroadcastOfferSchema, createAutoCareBroadcastRequestSchema, createAutoCareChatSchema, createAutoCareExpertQuestionSchema, createAutoCareFavoriteSchema, createAutoCareFleetSchema, createAutoCareFleetVehicleSchema, createAutoCareGuaranteeClaimSchema, createAutoCareReviewPromoSchema, createAutoCareReviewSchema, createAutoCareServiceAttachmentSchema, createAutoCareServiceMessageSchema, createAutoCareServiceOfferSchema, createAutoCareServiceQuoteSchema, createAutoCareServiceRequestSchema, createAutoCareRescheduleSchema, decideAutoCareRescheduleSchema, markAutoCareNoShowSchema, ownerAutoCareProviderSchema, ownerAutoCareReviewsQuerySchema, redeemAutoCareReviewPromoSchema, serviceMessageOfferDecisionSchema, syncAutoCareFavoritesSchema, updateAutoCareOfferSchema, updateAutoCareReviewSchema, uploadAutoCareProviderLogoSchema, uploadAutoCareProviderMediaSchema } from './autocare.schemas.js'
import { createAutoCareReview, createOwnerAutoCareProvider, createOwnerAutoCareReviewPromo, getAutoCareDiscovery, getAutoCareLocationZones, getAutoCareMarkets, getAutoCareProviderLogo, getAutoCareProviderOffers, getAutoCareProviderProfile, getAutoCareServiceDefinitions, getFeaturedAutoCareReviews, getMyAutoCareReviews, getOwnerAutoCareProviderReviews, getOwnerAutoCareProviders, getOwnerAutoCareReviews, redeemAutoCareReviewPromo, saveAutoCareProviderLogo, saveAutoCareProviderMedia, updateClientAutoCareReview, updateOwnerAutoCareOffer } from './autocare.service.js'
import { vehicleCatalogRoutes } from './vehicle-catalog.routes.js'
import { decodeAutoCareProviderLogo } from './autocare-provider-logo-storage.js'
import { decodeAutoCareProviderMedia, readAutoCareProviderMedia, type AutoCareProviderMediaKind } from './autocare-provider-media-storage.js'
import { acceptAutoCareServiceQuote, cancelAutoCareServiceRequest, completeAutoCareServiceRequest, confirmAutoCareServiceRequest, confirmOwnerAutoCareServiceRequest, createAutoCareServiceAttachment, createAutoCareServiceMessage, createAutoCareServiceOffer, createAutoCareServiceQuote, createAutoCareServiceRequest, decideAutoCareServiceOffer, decideAutoCareServiceReschedule, declineAutoCareServiceQuote, getAutoCareAvailability, getAutoCareServiceAttachment, getAutoCareServiceRequest, getAutoCareServiceRequestConversation, getMyAutoCareServiceRequests, getOwnerAutoCareServiceRequests, markAutoCareServiceConversationRead, markAutoCareServiceRequestNoShow, requestAutoCareServiceReschedule } from './autocare-request.service.js'
import { closeServiceChatGateway, sendServiceChatEvent, subscribeServiceChat } from './service-chat.gateway.js'
import { createAutoCareChat, createAutoCareChatAttachment, createAutoCareChatMessage, getAutoCareChat, getAutoCareChatAttachment, getAutoCareChatThreadForRequest, getMyAutoCareChats, markAutoCareChatRead } from './autocare-chat.service.js'
import { createAutoCareBroadcastOffer, createAutoCareBroadcastRequest, createAutoCareExpertQuestion, createAutoCareFleet, createAutoCareFleetVehicle, createAutoCareGuaranteeClaim, getAutoCareFairPrice, getAutoCareProviderTrust, getAutoCareRepairTimeline, getMyAutoCareBroadcastRequests, getMyAutoCareExpertQuestions, getMyAutoCareFleets, getMyAutoCareGuaranteeClaims, getOwnerAutoCareBroadcastRequests, getAutoCareBroadcastRequest } from './autocare-marketplace.service.js'
import { addAutoCareFavorite, getMyAutoCareFavorites, removeAutoCareFavorite, syncAutoCareFavorites } from './autocare-favorites.service.js'

const serviceRequestRateLimit = createRateLimitPreHandler({ maxRequests: 10, scope: 'autocare:request', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
const serviceRequestTransitionRateLimit = createRateLimitPreHandler({ maxRequests: 30, scope: 'autocare:request-transition', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
const autoCareMutationRateLimit = createRateLimitPreHandler({ maxRequests: 20, scope: 'autocare:mutation', windowMs: 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
const autoCareUploadRateLimit = createRateLimitPreHandler({ maxRequests: 10, scope: 'autocare:upload', windowMs: 60 * 60 * 1000, keyResolvers: [getAuthenticatedUserRateLimitIdentifier] })
const MAX_WEBSOCKET_MESSAGE_BYTES = 64 * 1024
const MAX_WEBSOCKET_EVENTS_PER_MINUTE = 120

function getWebSocketToken(request: FastifyRequest) {
    const rawProtocols = request.headers['sec-websocket-protocol']
    const protocols = Array.isArray(rawProtocols)
        ? rawProtocols
        : typeof rawProtocols === 'string'
            ? rawProtocols.split(',').map((value) => value.trim())
            : []
    const bearerProtocol = protocols.find((protocol) => protocol.startsWith('bearer.'))
    return bearerProtocol?.slice('bearer.'.length) ?? ''
}

function isAllowedWebSocketOrigin(request: FastifyRequest) {
    const origin = request.headers.origin
    return !origin || env.corsOrigins.includes(origin)
}

function getWebSocketPayloadSize(raw: unknown) {
    if (typeof raw === 'string') return Buffer.byteLength(raw)
    if (Buffer.isBuffer(raw)) return raw.byteLength
    if (raw instanceof ArrayBuffer) return raw.byteLength
    if (Array.isArray(raw)) return raw.reduce((total, chunk) => total + (Buffer.isBuffer(chunk) ? chunk.byteLength : 0), 0)
    return Number.MAX_SAFE_INTEGER
}

function createWebSocketEventGuard() {
    let windowStartedAt = Date.now()
    let eventCount = 0

    return () => {
        const now = Date.now()
        if (now - windowStartedAt >= 60_000) {
            windowStartedAt = now
            eventCount = 0
        }
        eventCount += 1
        return eventCount <= MAX_WEBSOCKET_EVENTS_PER_MINUTE
    }
}

export async function autoCareRoutes(app: FastifyInstance) {
    app.addHook('onClose', async () => closeServiceChatGateway())
    await app.register(vehicleCatalogRoutes)
    app.get('/v1/markets', async () => getAutoCareMarkets())
    app.get('/v1/markets/:marketId/zones', async (request) => {
        const params = validateParams(autoCareMarketParamsSchema, request.params)
        const query = validateQuery(autoCareLocationZonesQuerySchema, request.query)
        const coordinates = query.latitude !== undefined && query.longitude !== undefined ? { latitude: query.latitude, longitude: query.longitude } : undefined
        return getAutoCareLocationZones(params.marketId, query.parentId, coordinates, query.limit)
    })
    app.get('/v1/service-definitions', async () => getAutoCareServiceDefinitions())
    app.get('/v1/fair-price', async (request) => getAutoCareFairPrice(validateQuery(autoCareFairPriceQuerySchema, request.query)))
    app.get('/v1/reviews/featured', async (request) => getFeaturedAutoCareReviews(validateQuery(autoCareFeaturedReviewsQuerySchema, request.query).limit))
    app.get('/uploads/autocare/logos/:fileName', async (request, reply) => {
        const logo = await getAutoCareProviderLogo(String((request.params as { fileName: string }).fileName))
        return reply.header('cache-control', 'public, max-age=31536000, immutable').type('image/webp').send(logo)
    })
    app.get('/uploads/autocare/media/:kind/:fileName', async (request, reply) => {
        const params = request.params as { kind: string; fileName: string }
        if (params.kind !== 'cover' && params.kind !== 'gallery') return reply.code(404).send()
        const image = await readAutoCareProviderMedia(params.kind, params.fileName)
        return reply.header('cache-control', 'public, max-age=31536000, immutable').type('image/webp').send(image)
    })
    app.get('/v1/discovery/providers', async (request) => getAutoCareDiscovery(validateQuery(autoCareDiscoveryQuerySchema, request.query)))
    app.get('/v1/favorites/providers', async (request) => getMyAutoCareFavorites(await requireAuth(request)))
    app.post('/v1/favorites/providers/sync', { preHandler: autoCareMutationRateLimit }, async (request) => syncAutoCareFavorites(await requireAuth(request), validateBody(syncAutoCareFavoritesSchema, request.body).providerIds))
    app.post('/v1/favorites/providers/:providerId', { preHandler: autoCareMutationRateLimit }, async (request) => {
        const params = validateParams(autoCareFavoriteParamsSchema, request.params)
        return addAutoCareFavorite(await requireAuth(request), params.providerId, validateBody(createAutoCareFavoriteSchema, request.body).locationId)
    })
    app.delete('/v1/favorites/providers/:providerId', { preHandler: autoCareMutationRateLimit }, async (request) => removeAutoCareFavorite(await requireAuth(request), validateParams(autoCareFavoriteParamsSchema, request.params).providerId))
    app.get('/v1/providers/:providerId', async (request) => getAutoCareProviderProfile(validateParams(autoCareProviderParamsSchema, request.params).providerId))
    app.get('/v1/providers/:providerId/trust', async (request) => getAutoCareProviderTrust(validateParams(autoCareProviderParamsSchema, request.params).providerId))
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
    app.patch('/owner/autocare-providers/:providerId/offers/:offerId', { preHandler: autoCareMutationRateLimit }, async (request) => {
        const params = validateParams(autoCareOfferParamsSchema, request.params)
        const body = validateBody(updateAutoCareOfferSchema, request.body)
        return updateOwnerAutoCareOffer(await requireVerifiedEmail(request), params.providerId, params.offerId, body)
    })
    app.get('/owner/autocare-providers/:providerId/reviews', async (request) => {
        const params = validateParams(autoCareProviderParamsSchema, request.params)
        return getOwnerAutoCareProviderReviews(await requireVerifiedEmail(request), params.providerId)
    })
    app.get('/owner/autocare-reviews', async (request) => getOwnerAutoCareReviews(await requireVerifiedEmail(request), validateQuery(ownerAutoCareReviewsQuerySchema, request.query).providerId))
    app.post('/owner/autocare-providers/:providerId/reviews/:reviewId/promos', { preHandler: autoCareMutationRateLimit }, async (request) => {
        const params = validateParams(autoCareReviewParamsSchema, request.params)
        return createOwnerAutoCareReviewPromo(await requireVerifiedEmail(request), params.providerId, params.reviewId, validateBody(createAutoCareReviewPromoSchema, request.body))
    })
    app.post('/owner/autocare-providers/logo', { preHandler: autoCareUploadRateLimit, bodyLimit: 1_500_000 }, async (request) => {
        const body = validateBody(uploadAutoCareProviderLogoSchema, request.body)
        return saveAutoCareProviderLogo(await requireVerifiedEmail(request), decodeAutoCareProviderLogo(body.contentBase64))
    })
    app.post('/owner/autocare-providers/media', { preHandler: autoCareUploadRateLimit, bodyLimit: 9 * 1024 * 1024 }, async (request) => {
        const body = validateBody(uploadAutoCareProviderMediaSchema, request.body)
        const kind = body.kind as AutoCareProviderMediaKind
        return saveAutoCareProviderMedia(await requireVerifiedEmail(request), kind, decodeAutoCareProviderMedia(body.contentBase64))
    })
    app.post('/owner/autocare-providers', { preHandler: autoCareMutationRateLimit }, async (request) => createOwnerAutoCareProvider(await requireVerifiedEmail(request), validateBody(ownerAutoCareProviderSchema, request.body)))
    app.post('/v1/service-requests', { preHandler: serviceRequestRateLimit }, async (request) => createAutoCareServiceRequest(await requireVerifiedEmail(request), { ...validateBody(createAutoCareServiceRequestSchema, request.body), idempotencyKey: getOptionalIdempotencyKey(request.headers) }))
    app.get('/v1/service-requests/my', async (request) => getMyAutoCareServiceRequests(await requireAuth(request)))
    app.get('/v1/service-requests/:requestId/timeline', async (request) => getAutoCareRepairTimeline(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/v1/broadcast-requests', { preHandler: serviceRequestRateLimit }, async (request) => createAutoCareBroadcastRequest(await requireVerifiedEmail(request), validateBody(createAutoCareBroadcastRequestSchema, request.body)))
    app.get('/v1/broadcast-requests/my', async (request) => getMyAutoCareBroadcastRequests(await requireAuth(request)))
    app.get('/v1/broadcast-requests/:broadcastId', async (request) => getAutoCareBroadcastRequest(await requireAuth(request), validateParams(autoCareBroadcastParamsSchema, request.params).broadcastId))
    app.post('/v1/guarantee-claims', { preHandler: autoCareMutationRateLimit }, async (request) => createAutoCareGuaranteeClaim(await requireVerifiedEmail(request), validateBody(createAutoCareGuaranteeClaimSchema, request.body)))
    app.get('/v1/guarantee-claims/my', async (request) => getMyAutoCareGuaranteeClaims(await requireAuth(request)))
    app.post('/v1/expert-questions', { preHandler: autoCareMutationRateLimit }, async (request) => createAutoCareExpertQuestion(await requireVerifiedEmail(request), validateBody(createAutoCareExpertQuestionSchema, request.body)))
    app.get('/v1/expert-questions/my', async (request) => getMyAutoCareExpertQuestions(await requireAuth(request)))
    app.get('/owner/fleets', async (request) => getMyAutoCareFleets(await requireAuth(request)))
    app.post('/owner/fleets', { preHandler: autoCareMutationRateLimit }, async (request) => createAutoCareFleet(await requireVerifiedEmail(request), validateBody(createAutoCareFleetSchema, request.body)))
    app.post('/owner/fleets/:fleetId/vehicles', { preHandler: autoCareMutationRateLimit }, async (request) => createAutoCareFleetVehicle(await requireVerifiedEmail(request), validateParams(autoCareFleetParamsSchema, request.params).fleetId, validateBody(createAutoCareFleetVehicleSchema, request.body)))
    app.get('/v1/chats', async (request) => getMyAutoCareChats(await requireAuth(request)))
    app.post('/v1/chats', { preHandler: autoCareMutationRateLimit }, async (request) => createAutoCareChat(await requireVerifiedEmail(request), validateBody(createAutoCareChatSchema, request.body)))
    app.get('/v1/service-requests/:requestId/chat-thread', async (request) => getAutoCareChatThreadForRequest(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.get('/v1/chats/:chatId', async (request) => getAutoCareChat(await requireAuth(request), validateParams(autoCareChatParamsSchema, request.params).chatId))
    app.post('/v1/chats/:chatId/messages', { preHandler: serviceRequestTransitionRateLimit }, async (request) => createAutoCareChatMessage(await requireVerifiedEmail(request), validateParams(autoCareChatParamsSchema, request.params).chatId, validateBody(createAutoCareServiceMessageSchema, request.body)))
    app.post('/v1/chats/:chatId/read', async (request) => markAutoCareChatRead(await requireAuth(request), validateParams(autoCareChatParamsSchema, request.params).chatId))
    app.post('/v1/chats/:chatId/attachments', { preHandler: serviceRequestTransitionRateLimit, bodyLimit: 14 * 1024 * 1024 }, async (request) => createAutoCareChatAttachment(await requireVerifiedEmail(request), validateParams(autoCareChatParamsSchema, request.params).chatId, validateBody(createAutoCareServiceAttachmentSchema, request.body)))
    app.get('/v1/chats/:chatId/attachments/:attachmentId', async (request, reply) => {
        const params = validateParams(autoCareChatParamsSchema.extend({ attachmentId: autoCareServiceAttachmentParamsSchema.shape.attachmentId }), request.params)
        const attachment = await getAutoCareChatAttachment(await requireAuth(request), params.chatId, params.attachmentId)
        return reply
            .header('cache-control', 'private, no-store')
            .header('x-content-type-options', 'nosniff')
            .type(attachment.contentType)
            .send(attachment.content)
    })
    app.get('/v1/chats/:chatId/ws', { websocket: true }, async (socket, request) => {
        try {
            if (!isAllowedWebSocketOrigin(request)) {
                socket.close(1008, 'Origin not allowed')
                return
            }
            const token = getWebSocketToken(request)
            if (!token) {
                socket.close(4401, 'Unauthorized')
                return
            }
            const authRequest = token
                ? { ...request, headers: { ...request.headers, authorization: `Bearer ${token}` } } as FastifyRequest
                : request
            const user = await requireAuth(authRequest)
            const chatId = validateParams(autoCareChatParamsSchema, request.params).chatId
            await getAutoCareChat(user, chatId)
            const unsubscribe = subscribeServiceChat(chatId, socket)
            sendServiceChatEvent(socket, { type: 'presence', threadId: chatId, payload: { connected: true } })
            const allowEvent = createWebSocketEventGuard()
            socket.on('message', (raw) => {
                try {
                    if (getWebSocketPayloadSize(raw) > MAX_WEBSOCKET_MESSAGE_BYTES || !allowEvent()) {
                        socket.close(1009, 'WebSocket message limit exceeded')
                        return
                    }
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
    app.post('/v1/autocare-reviews', { preHandler: autoCareMutationRateLimit }, async (request) => createAutoCareReview(await requireVerifiedEmail(request), validateBody(createAutoCareReviewSchema, request.body)))
    app.post('/v1/autocare-review-promos/redeem', { preHandler: autoCareMutationRateLimit }, async (request) => redeemAutoCareReviewPromo(await requireVerifiedEmail(request), validateBody(redeemAutoCareReviewPromoSchema, request.body)))
    app.patch('/v1/autocare-reviews/:reviewId', { preHandler: autoCareMutationRateLimit }, async (request) => {
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
            if (!isAllowedWebSocketOrigin(request)) {
                socket.close(1008, 'Origin not allowed')
                return
            }
            const token = getWebSocketToken(request)
            if (!token) {
                socket.close(4401, 'Unauthorized')
                return
            }
            const authRequest = token
                ? { ...request, headers: { ...request.headers, authorization: `Bearer ${token}` } } as FastifyRequest
                : request
            const user = await requireAuth(authRequest)
            const requestId = validateParams(autoCareServiceRequestParamsSchema, request.params).requestId
            await getAutoCareServiceRequest(user, requestId)
            const unsubscribe = subscribeServiceChat(requestId, socket)
            sendServiceChatEvent(socket, { type: 'presence', requestId, payload: { connected: true } })
            const allowEvent = createWebSocketEventGuard()
            socket.on('message', (raw) => {
                try {
                    if (getWebSocketPayloadSize(raw) > MAX_WEBSOCKET_MESSAGE_BYTES || !allowEvent()) {
                        socket.close(1009, 'WebSocket message limit exceeded')
                        return
                    }
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
        return reply
            .header('cache-control', 'private, no-store')
            .header('x-content-type-options', 'nosniff')
            .type(attachment.contentType)
            .send(attachment.content)
    })
    app.post('/v1/service-requests/:requestId/confirm', { preHandler: serviceRequestTransitionRateLimit }, async (request) => confirmAutoCareServiceRequest(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/v1/service-requests/:requestId/cancel', { preHandler: serviceRequestTransitionRateLimit }, async (request) => cancelAutoCareServiceRequest(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(cancelAutoCareServiceRequestSchema, request.body).reason))
    app.post('/v1/service-requests/:requestId/reschedule/decision', { preHandler: serviceRequestTransitionRateLimit }, async (request) => {
        const params = validateParams(autoCareServiceRequestParamsSchema, request.params)
        const body = validateBody(decideAutoCareRescheduleSchema, request.body)
        return decideAutoCareServiceReschedule(await requireVerifiedEmail(request), params.requestId, body.decision, body.reason)
    })
    app.post('/v1/service-requests/:requestId/quote/accept', { preHandler: serviceRequestTransitionRateLimit }, async (request) => acceptAutoCareServiceQuote(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/v1/service-requests/:requestId/quote/decline', { preHandler: serviceRequestTransitionRateLimit }, async (request) => declineAutoCareServiceQuote(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.get('/owner/service-requests', async (request) => getOwnerAutoCareServiceRequests(await requireAuth(request)))
    app.get('/owner/broadcast-requests', async (request) => getOwnerAutoCareBroadcastRequests(await requireAuth(request)))
    app.post('/owner/broadcast-requests/:broadcastId/offers', { preHandler: serviceRequestTransitionRateLimit }, async (request) => createAutoCareBroadcastOffer(await requireVerifiedEmail(request), validateParams(autoCareBroadcastParamsSchema, request.params).broadcastId, validateBody(createAutoCareBroadcastOfferSchema, request.body)))
    app.post('/owner/service-requests/:requestId/confirm', { preHandler: serviceRequestTransitionRateLimit }, async (request) => confirmOwnerAutoCareServiceRequest(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/owner/service-requests/:requestId/quote', { preHandler: serviceRequestTransitionRateLimit }, async (request) => createAutoCareServiceQuote(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(createAutoCareServiceQuoteSchema, request.body)))
    app.post('/owner/service-requests/:requestId/reschedule', { preHandler: serviceRequestTransitionRateLimit }, async (request) => requestAutoCareServiceReschedule(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(createAutoCareRescheduleSchema, request.body)))
    app.post('/owner/service-requests/:requestId/no-show', { preHandler: serviceRequestTransitionRateLimit }, async (request) => markAutoCareServiceRequestNoShow(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(markAutoCareNoShowSchema, request.body).reason))
    app.post('/owner/service-requests/:requestId/complete', { preHandler: serviceRequestTransitionRateLimit }, async (request) => completeAutoCareServiceRequest(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId, validateBody(completeAutoCareServiceRequestSchema, request.body).note))
}
