import type { FastifyInstance } from 'fastify'

import { validateParams, validateQuery } from '../../shared/validation/validate.js'
import { autoCareDiscoveryQuerySchema, autoCareProviderOffersQuerySchema, autoCareProviderParamsSchema } from './autocare.schemas.js'
import { getAutoCareDiscovery, getAutoCareMarkets, getAutoCareProviderOffers, getAutoCareProviderProfile, getAutoCareServiceDefinitions } from './autocare.service.js'

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
}
