import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateThreatSurface } from './check-threat-surface.mjs'

const sourceMap = {
    app: [
        'bodyLimit: MAX_FASTIFY_JSON_BODY_BYTES',
        'assertTrustedRequestOrigin(request,',
        'assertValidCsrfToken(request)',
        'await app.register(\n        helmet,',
        'maxPayload: 64 * 1024',
    ].join('\n'),
    autocare: [
        "app.get('/v1/discovery/providers', { preHandler: autoCareDiscoveryRateLimit }",
        "'cache-control', 'public, max-age=5, stale-while-revalidate=15'",
        "app.post('/owner/autocare-providers/logo', { preHandler: autoCareUploadRateLimit",
        "app.post('/owner/autocare-providers/media', { preHandler: autoCareUploadRateLimit",
        "app.post('/v1/chats/:chatId/attachments', { preHandler: serviceRequestTransitionRateLimit",
        "app.post('/v1/service-requests/:requestId/attachments', { preHandler: serviceRequestTransitionRateLimit",
        "app.get('/v1/chats/:chatId/ws', { websocket: true }",
        "app.get('/v1/service-requests/:requestId/ws', { websocket: true }",
        'isAllowedWebSocketOrigin(request)',
        'getWebSocketToken(request)',
        'await requireAuth(authRequest)',
        'MAX_WEBSOCKET_MESSAGE_BYTES',
        'MAX_WEBSOCKET_EVENTS_PER_MINUTE',
    ].join('\n'),
    platformReviews: [
        "app.post('/v1/platform-reviews', { preHandler: createPlatformReviewRateLimit }",
        'getOptionalIdempotencyKey(request.headers)',
        'await requireVerifiedEmail(request)',
    ].join('\n'),
    admin: [
        "app.get('/admin/autocare-appeals', async (request) => {",
        'const user = await requireAuth(request)',
        'AutoCareAppealsViewed',
        'AutoCareModerationQueueViewed',
        'AutoCareChatReportsViewed',
    ].join('\n'),
}

test('threat-surface contract passes for all critical controls', () => {
    const results = evaluateThreatSurface(sourceMap)
    assert.equal(results.filter((result) => result.status === 'blocked').length, 0)
})

test('threat-surface contract reports the exact missing control', () => {
    const results = evaluateThreatSurface({ ...sourceMap, platformReviews: '' })
    const platformReviews = results.find((result) => result.name === 'Platform review abuse controls')
    assert.equal(platformReviews?.status, 'blocked')
    assert.match(platformReviews?.detail ?? '', /createPlatformReviewRateLimit/)
})
