import type { FastifyInstance } from 'fastify'

import { requireVerifiedEmail } from '../auth/require-auth.js'
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validate.js'
import { autoCareDiscoveryQuerySchema, autoCareProviderOffersQuerySchema, autoCareProviderParamsSchema, ownerAutoCareProviderSchema } from './autocare.schemas.js'
import { createOwnerAutoCareProvider, getAutoCareDiscovery, getAutoCareMarkets, getAutoCareProviderOffers, getAutoCareProviderProfile, getAutoCareServiceDefinitions, getOwnerAutoCareProviders } from './autocare.service.js'

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
}
