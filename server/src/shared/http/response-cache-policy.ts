import type { FastifyInstance } from 'fastify'

const publicCacheRoutes = new Set([
    '/v1/discovery/providers',
    '/uploads/autocare/logos/:fileName',
    '/uploads/autocare/media/:kind/:fileName',
    '/uploads/cabinets/:fileName',
])

export function registerResponseCachePolicy(app: FastifyInstance) {
    app.addHook('onSend', async (request, reply, payload) => {
        const cacheControl = reply.getHeader('cache-control')
        const hasPublicPolicy = typeof cacheControl === 'string'
            && /^\s*public(?:\s*,|\s*$)/i.test(cacheControl)
            && !/\b(?:private|no-store)\b/i.test(cacheControl)
        const publicResponse = (request.method === 'GET' || request.method === 'HEAD')
            && publicCacheRoutes.has(request.routeOptions.url ?? '')
            && (reply.statusCode >= 200 && reply.statusCode < 300 || reply.statusCode === 304)
            && !request.headers.authorization && !request.headers.cookie
            && reply.getHeader('set-cookie') === undefined
            && hasPublicPolicy

        if (!publicResponse) {
            reply.header('cache-control', 'private, no-store')
            reply.header('pragma', 'no-cache')
        }
        return payload
    })
}
