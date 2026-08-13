import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { validateQuery } from '../../shared/validation/validate.js'
import { getVehicleCatalog } from '../vehicles/vehicle-catalog.js'

const vehicleCatalogQuerySchema = z.object({
    brandId: z.string().trim().min(1).max(60).optional(),
})

export async function vehicleCatalogRoutes(app: FastifyInstance) {
    app.get('/v1/vehicle-catalog', async (request) => {
        return getVehicleCatalog(validateQuery(vehicleCatalogQuerySchema, request.query).brandId)
    })
}
