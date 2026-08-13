import type { FastifyInstance } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import { createRateLimitPreHandler, getAuthenticatedUserRateLimitIdentifier } from '../../shared/security/rate-limit.js'
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validate.js'
import { autoCareDiscoveryQuerySchema, autoCareProviderOffersQuerySchema, autoCareProviderParamsSchema, autoCareServiceRequestParamsSchema, createAutoCareServiceRequestSchema, ownerAutoCareProviderSchema } from './autocare.schemas.js'
import { createOwnerAutoCareProvider, getAutoCareDiscovery, getAutoCareMarkets, getAutoCareProviderOffers, getAutoCareProviderProfile, getAutoCareServiceDefinitions, getOwnerAutoCareProviders } from './autocare.service.js'
import { confirmAutoCareServiceRequest, confirmOwnerAutoCareServiceRequest, createAutoCareServiceRequest, getAutoCareServiceRequest, getMyAutoCareServiceRequests, getOwnerAutoCareServiceRequests } from './autocare-request.service.js'

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
    app.post('/v1/service-requests', { preHandler: serviceRequestRateLimit }, async (request) => createAutoCareServiceRequest(await requireVerifiedEmail(request), validateBody(createAutoCareServiceRequestSchema, request.body)))
    app.get('/v1/service-requests/my', async (request) => getMyAutoCareServiceRequests(await requireAuth(request)))
    app.get('/v1/service-requests/:requestId', async (request) => getAutoCareServiceRequest(await requireAuth(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.post('/v1/service-requests/:requestId/confirm', { preHandler: serviceRequestTransitionRateLimit }, async (request) => confirmAutoCareServiceRequest(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
    app.get('/owner/service-requests', async (request) => getOwnerAutoCareServiceRequests(await requireAuth(request)))
    app.post('/owner/service-requests/:requestId/confirm', { preHandler: serviceRequestTransitionRateLimit }, async (request) => confirmOwnerAutoCareServiceRequest(await requireVerifiedEmail(request), validateParams(autoCareServiceRequestParamsSchema, request.params).requestId))
}
