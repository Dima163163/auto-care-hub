import type { FastifyInstance } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import {
    validateBody,
    validateParams,
    validateQuery,
} from '../../shared/validation/validate.js'
import {
    createOwnerServiceSchema,
    serviceParamsSchema,
    servicesQuerySchema,
    updateOwnerServiceSchema,
    updateOwnerServiceStatusSchema,
} from './services.schemas.js'
import {
    createOwnerService,
    deleteOwnerService,
    getOwnerServices,
    getPublicServicesByCabinetId,
    updateOwnerService,
    updateOwnerServiceStatus,
} from './services.service.js'
import type { PublicService } from './services.types.js'

type ServicesListResponse = PublicService[]
type ServiceResponse = PublicService
type DeleteServiceResponse = {
    success: true
}

export async function servicesRoutes(app: FastifyInstance) {
    app.get<{ Querystring: unknown; Reply: ServicesListResponse }>(
        '/services',
        async (request) => {
            const query = validateQuery(servicesQuerySchema, request.query)

            return getPublicServicesByCabinetId(query.cabinetId)
        }
    )

    app.get<{ Reply: ServicesListResponse }>(
        '/owner/services',
        async (request) => {
            const user = await requireAuth(request)

            return getOwnerServices(user)
        }
    )

    app.post<{ Body: unknown; Reply: ServiceResponse }>(
        '/services',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const body = validateBody(createOwnerServiceSchema, request.body)

            return createOwnerService(user, body)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: ServiceResponse }>(
        '/services/:id',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(serviceParamsSchema, request.params)
            const body = validateBody(updateOwnerServiceSchema, request.body)

            return updateOwnerService(user, params.id, body)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: ServiceResponse }>(
        '/services/:id/status',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(serviceParamsSchema, request.params)
            const body = validateBody(updateOwnerServiceStatusSchema, request.body)

            return updateOwnerServiceStatus(user, params.id, body.isActive)
        }
    )

    app.delete<{ Params: unknown; Reply: DeleteServiceResponse }>(
        '/services/:id',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(serviceParamsSchema, request.params)

            return deleteOwnerService(user, params.id)
        }
    )
}
