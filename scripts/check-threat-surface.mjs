import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

function check(name, source, fragments, detail) {
    const missing = fragments.filter((fragment) => !source.includes(fragment))
    return missing.length === 0
        ? { name, status: 'pass', detail }
        : { name, status: 'blocked', detail: `missing controls: ${missing.join('; ')}` }
}

/**
 * Verifies the source-level controls that protect the highest-risk request
 * surfaces. This is intentionally a deterministic repository gate: it does
 * not replace an independent penetration test or a staging replay.
 */
export function evaluateThreatSurface(sourceMap) {
    return [
        check(
            'Application request boundary',
            sourceMap.app,
            [
                'bodyLimit: MAX_FASTIFY_JSON_BODY_BYTES',
                "assertTrustedRequestOrigin(request,",
                'assertValidCsrfToken(request)',
                "await app.register(\n        helmet,",
                'maxPayload: 64 * 1024',
            ],
            'global body, browser mutation, security-header and WebSocket payload limits are wired',
        ),
        check(
            'Public discovery controls',
            sourceMap.autocare,
            [
                "app.get('/v1/discovery/providers', { preHandler: autoCareDiscoveryRateLimit }",
                "'cache-control', 'public, max-age=5, stale-while-revalidate=15'",
            ],
            'discovery has an explicit public rate limit and bounded stale cache policy',
        ),
        check(
            'Public availability controls',
            sourceMap.autocare,
            [
                "const autoCareAvailabilityRateLimit = createRateLimitPreHandler({ maxRequests: 60, scope: 'autocare:availability', windowMs: 60 * 1000 })",
                "app.get('/v1/providers/:providerId/availability', { preHandler: autoCareAvailabilityRateLimit }",
            ],
            'slot availability has a bounded public rate limit before the expensive calendar calculation',
        ),
        check(
            'AutoCare upload controls',
            sourceMap.autocare,
            [
                "app.post('/owner/autocare-providers/logo', { preHandler: autoCareUploadRateLimit",
                "app.post('/owner/autocare-providers/media', { preHandler: autoCareUploadRateLimit",
                "app.post('/v1/chats/:chatId/attachments', { preHandler: serviceRequestTransitionRateLimit",
                "app.post('/v1/service-requests/:requestId/attachments', { preHandler: serviceRequestTransitionRateLimit",
            ],
            'provider and conversation uploads use bounded pre-handlers and body limits',
        ),
        check(
            'WebSocket authentication and origin controls',
            sourceMap.autocare,
            [
                "app.get('/v1/chats/:chatId/ws', { websocket: true }",
                "app.get('/v1/service-requests/:requestId/ws', { websocket: true }",
                'isAllowedWebSocketOrigin(request)',
                'getWebSocketToken(request)',
                'await requireAuth(authRequest)',
                'MAX_WEBSOCKET_MESSAGE_BYTES',
                'MAX_WEBSOCKET_EVENTS_PER_MINUTE',
            ],
            'both realtime surfaces require an allowed origin, bearer protocol and authenticated participant',
        ),
        check(
            'Platform review abuse controls',
            sourceMap.platformReviews,
            [
                "app.post('/v1/platform-reviews', { preHandler: createPlatformReviewRateLimit }",
                'getOptionalIdempotencyKey(request.headers)',
                'await requireVerifiedEmail(request)',
            ],
            'platform review creation is authenticated, rate-limited and idempotent',
        ),
        check(
            'Admin moderation boundary',
            sourceMap.admin,
            [
                "app.get('/admin/autocare-appeals', async (request) => {",
                'const user = await requireAuth(request)',
                'AutoCareAppealsViewed',
                'AutoCareModerationQueueViewed',
                'AutoCareChatReportsViewed',
            ],
            'moderation queues authenticate callers and emit bounded audit events',
        ),
    ]
}

export function loadThreatSurfaceSources(root = PROJECT_ROOT) {
    const files = {
        app: 'server/src/app.ts',
        autocare: 'server/src/modules/autocare/autocare.routes.ts',
        platformReviews: 'server/src/modules/platform-reviews/platform-reviews.routes.ts',
        admin: 'server/src/modules/admin/admin.routes.ts',
    }

    return Object.fromEntries(Object.entries(files).map(([name, relativePath]) => [
        name,
        readFileSync(resolve(root, relativePath), 'utf8'),
    ]))
}

export function formatThreatSurfaceResults(results) {
    const lines = ['Threat-surface source contract']
    for (const result of results) {
        lines.push(`[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)
    }
    return lines.join('\n')
}

async function main() {
    const results = evaluateThreatSurface(loadThreatSurfaceSources())
    console.log(formatThreatSurfaceResults(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
