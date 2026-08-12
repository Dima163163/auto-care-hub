import { timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'

import { env } from '../config/env.js'
import { getBoundedMetricsSnapshot, metrics } from '../shared/observability/metrics.js'

export function getMetricsResponseHeaders() {
    return {
        'cache-control': 'no-store',
        pragma: 'no-cache',
    } as const
}

export function isMetricsAuthorizationValid(
    authorization: string | undefined,
    expectedToken: string | null,
) {
    if (!expectedToken || !authorization?.startsWith('Bearer ')) return false

    const received = Buffer.from(authorization.slice('Bearer '.length))
    const expected = Buffer.from(expectedToken)

    return received.length === expected.length && timingSafeEqual(received, expected)
}

function hasValidMetricsToken(request: FastifyRequest) {
    const authorization = request.headers.authorization

    return isMetricsAuthorizationValid(authorization, env.metricsToken)
}

export async function metricsRoutes(app: FastifyInstance) {
    app.get('/internal/metrics', async (request, reply) => {
        reply.headers(getMetricsResponseHeaders())

        if (!env.metricsToken) {
            return reply.status(404).send({ error: 'Not found' })
        }

        if (!hasValidMetricsToken(request)) {
            return reply.status(401).send({ error: 'Unauthorized' })
        }

        return reply.type('application/json').send(getBoundedMetricsSnapshot(metrics.snapshot()))
    })
}
