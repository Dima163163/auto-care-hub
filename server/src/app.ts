import { randomUUID } from 'node:crypto'

import Fastify, { type FastifyRequest } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import websocket from '@fastify/websocket'

import { env } from './config/env.js'
import { connectDatabase } from './database/database.js'
import { assertDatabaseSchemaContract } from './database/schema-contract.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { cabinetsRoutes } from './modules/cabinets/cabinets.routes.js'
import { servicesRoutes } from './modules/services/services.routes.js'
import { bookingsRoutes } from './modules/bookings/bookings.routes.js'
import { reviewsRoutes } from './modules/reviews/reviews.routes.js'
import { devRoutes } from './routes/dev.route.js'
import { healthRoutes } from './routes/health.route.js'
import { adminRoutes } from './modules/admin/admin.routes.js'
import { oauthRoutes } from './modules/oauth/oauth.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'
import { autoCareRoutes } from './modules/autocare/autocare.routes.js'
import { platformReviewsRoutes } from './modules/platform-reviews/platform-reviews.routes.js'
import { bootstrapSuperAdmin } from './modules/bootstrap/bootstrap-super-admin.js'
import { registerErrorHandler } from './shared/errors/error-handler.js'
import { registerNotFoundHandler } from './shared/errors/not-found-handler.js'
import { getSecurityHeadersOptions } from './shared/security/security-headers.js'
import { getCorsOptions } from './shared/security/cors.js'
import { createMailer } from './shared/mail/create-mailer.js'
import { enqueuePasswordSetupEmailSafely } from './modules/outbox/password-setup-outbox.service.js'
import { createTrustedProxyPolicy } from './shared/security/trusted-proxy.js'
import { setApplicationLogger } from './shared/observability/logger.js'
import { metrics } from './shared/observability/metrics.js'
import { metricsRoutes } from './routes/metrics.route.js'
import { openApiRoutes } from './routes/openapi.route.js'
import { sanitizeIncomingRequestId } from './shared/http/request-id.js'
import { MAX_FASTIFY_JSON_BODY_BYTES } from './shared/security/request-limits.js'
import { getBoundedApiLatencyMs } from './shared/observability/api-latency.js'
import { deploymentCapabilitiesRoutes } from './routes/deployment-capabilities.route.js'
import {
    isSecurityIpBlocked,
    shouldRecordSecurityMitigationSignal,
} from './modules/admin/security-mitigation-guard.js'
import { createApiErrorResponse } from './shared/errors/api-error-response.js'
import { ERROR_CODES } from './shared/errors/error-codes.js'
import { getLocalizedErrorMessage } from './shared/i18n/error-message.js'
import { getRequestLocale } from './shared/i18n/request-locale.js'
import { recordSecurityActivitySafely } from './modules/auth/security-event-stream.js'
import { assertTrustedRequestOrigin } from './shared/security/csrf-origin.js'
import { assertValidCsrfToken } from './shared/security/csrf-token.js'
import {
    SecurityEventAuthOutcome,
    SecurityEventRateLimitResult,
    SecurityEventSeverity,
    SecurityEventType,
} from './entities/security-event/security-event.entity.js'

const requestStartedAt = new WeakMap<FastifyRequest, number>()

export async function buildApp() {
    const app = Fastify({
        bodyLimit: MAX_FASTIFY_JSON_BODY_BYTES,
        trustProxy: createTrustedProxyPolicy(env.trustedProxy),
        genReqId: (request) => {
            return sanitizeIncomingRequestId(request.headers['x-request-id']) ?? randomUUID()
        },
        logger: {
            level: env.nodeEnv === 'production' ? 'info' : 'debug',
            redact: {
                censor: '[REDACTED]',
                paths: [
                    'req.headers.authorization',
                    'req.headers.cookie',
                    'req.headers.sec-websocket-protocol',
                    'res.headers.set-cookie',
                ],
            },
        },
    })

    setApplicationLogger(app.log)

    app.log.info(
        {
            trustedProxyHops: env.trustedProxy.hops,
            trustedProxyCidrCount: env.trustedProxy.cidrs.length,
        },
        'Trusted proxy policy configured'
    )

    registerErrorHandler(app)
    registerNotFoundHandler(app)

    app.addHook('onRequest', async (request, reply) => {
        requestStartedAt.set(request, Date.now())
        reply.header('x-request-id', request.id)
        reply.header('x-content-type-options', 'nosniff')
        reply.header('permissions-policy', 'camera=(), geolocation=(), microphone=()')
    })

    app.addHook('onRequest', async (request, reply) => {
        if (request.url === '/health' || request.url.startsWith('/health/')) return
        if (!await isSecurityIpBlocked(request.ip)) return

        if (shouldRecordSecurityMitigationSignal(request.ip)) {
            void recordSecurityActivitySafely({
                request,
                type: SecurityEventType.RateLimitExceeded,
                severity: SecurityEventSeverity.High,
                statusCode: 403,
                authOutcome: SecurityEventAuthOutcome.Anonymous,
                rateLimitResult: SecurityEventRateLimitResult.Blocked,
                reasonCode: 'security_mitigation_block',
            })
        }

        return reply
            .status(403)
            .header('cache-control', 'no-store')
            .send(createApiErrorResponse({
                statusCode: 403,
                code: ERROR_CODES.Forbidden,
                message: getLocalizedErrorMessage(
                    ERROR_CODES.Forbidden,
                    'Request blocked by a temporary security mitigation.',
                    getRequestLocale(request),
                ),
                requestId: request.id,
            }))
    })

    app.addHook('onResponse', async (request, reply) => {
        const startedAt = requestStartedAt.get(request)
        if (startedAt === undefined) return

        const statusClass = `${Math.floor(reply.statusCode / 100)}xx`
        const route = request.routeOptions.url ?? 'unknown'

        metrics.increment('api_requests_total', 1, {
            method: request.method,
            route,
            status_class: statusClass,
        })
        metrics.observe('api_request_duration_ms', getBoundedApiLatencyMs(startedAt), {
            method: request.method,
            route,
        })
        requestStartedAt.delete(request)
    })

    const mailer = createMailer(env.mail, app.log)
    app.decorate('mailer', mailer)

    if (env.mail.mode === 'smtp') {
        await mailer.verify()
        app.log.info('SMTP transport verified')
    }

    await connectDatabase()
    await assertDatabaseSchemaContract()

    const bootstrapResult = await bootstrapSuperAdmin({
        email: env.bootstrap.superAdminEmail,
        name: env.bootstrap.superAdminName,
    })

    if (bootstrapResult.action !== 'skipped') {
        app.log.info(
            {
                action: bootstrapResult.action,
                email: bootstrapResult.email,
            },
            'Super admin bootstrap completed'
        )

        if (bootstrapResult.passwordSetupToken) {
            await enqueuePasswordSetupEmailSafely({
                email: bootstrapResult.email,
                expiresAt: bootstrapResult.passwordSetupToken.expiresAt,
                frontendOrigin: env.frontendOrigin,
                token: bootstrapResult.passwordSetupToken.token,
            })
        }
    }

    await app.register(cookie)
    app.addHook('preHandler', async (request) => {
        if (env.nodeEnv !== 'production') return
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return
        if (request.url.startsWith('/webhooks/') || request.url.startsWith('/health')) return

        // Native clients authenticate with a bearer token and do not receive
        // browser cookies. Browser sessions do, so protect every mutation
        // carrying the refresh/CSRF cookie instead of maintaining a route list
        // that can silently drift as new AutoCare endpoints are added.
        const hasBrowserSession = Boolean(
            request.cookies[env.auth.refreshTokenCookieName]
            || request.cookies[env.auth.csrfTokenCookieName],
        )
        if (!hasBrowserSession) return

        assertTrustedRequestOrigin(request, {
            allowedOrigins: env.corsOrigins,
            isProduction: true,
        })
        assertValidCsrfToken(request)
    })
    await app.register(
        helmet,
        getSecurityHeadersOptions({
            isProduction: env.nodeEnv === 'production',
        })
    )

    await app.register(cors, getCorsOptions(env.corsOrigins))
    await app.register(websocket, {
        options: {
            maxPayload: 64 * 1024,
        },
    })

    await app.register(healthRoutes)
    await app.register(metricsRoutes)
    await app.register(deploymentCapabilitiesRoutes)
    await app.register(openApiRoutes)
    await app.register(authRoutes, {
        mailer,
    })
    await app.register(oauthRoutes)
    await app.register(cabinetsRoutes)
    await app.register(servicesRoutes)
    await app.register(bookingsRoutes)
    await app.register(reviewsRoutes)
    await app.register(usersRoutes)
    await app.register(notificationsRoutes)
    await app.register(autoCareRoutes)
    await app.register(platformReviewsRoutes)
    await app.register(adminRoutes, {
        mailer,
    })

    if (env.nodeEnv === 'development') {
        await app.register(devRoutes)
    }

    return app
}
