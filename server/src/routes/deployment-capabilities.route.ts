import type { FastifyInstance } from 'fastify'

import { env } from '../config/env.js'
import { getDeploymentCapabilities } from '../config/deployment-capabilities.js'

export async function deploymentCapabilitiesRoutes(app: FastifyInstance) {
    app.get('/v1/deployment-capabilities', async () =>
        getDeploymentCapabilities(env.deployment.deploymentMarket)
    )
}
