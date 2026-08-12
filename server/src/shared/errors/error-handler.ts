import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import { ERROR_CODES } from './error-codes.js'
import { AppError } from './app-error.js'
import type { ApiErrorResponse } from './types.js'
import { formatZodIssues } from '../validation/format-zod-issues.js'
import {
    recordSystemIncidentSafely,
} from '../../modules/admin/system-incidents.service.js'
import {
    SystemIncidentSeverity,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'
import { reportExternalErrorSafely } from '../observability/error-reporter.js'
import { createApiErrorResponse } from './api-error-response.js'
import { getRequestLocale } from '../i18n/request-locale.js'
import { getLocalizedErrorMessage } from '../i18n/error-message.js'
import {
    SecurityEventAuthOutcome,
    SecurityEventSeverity,
    SecurityEventRateLimitResult,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { recordSecurityActivitySafely } from '../../modules/auth/security-event-stream.js'

function recordSecurityFailure(
    request: FastifyRequest,
    statusCode: number,
    metadata: Record<string, unknown> = {},
) {
    const type = statusCode === 429
        ? SecurityEventType.RateLimitExceeded
        : statusCode === 403
            ? SecurityEventType.PrivilegeDenied
            : SecurityEventType.InvalidToken
    const severity = statusCode === 429
        ? SecurityEventSeverity.High
        : statusCode === 403
            ? SecurityEventSeverity.Warning
            : SecurityEventSeverity.Info

    void recordSecurityActivitySafely({
        request,
        type,
        severity,
        statusCode,
        authOutcome: statusCode === 401
            ? SecurityEventAuthOutcome.Failed
            : SecurityEventAuthOutcome.Unknown,
        rateLimitResult: statusCode === 429
            ? SecurityEventRateLimitResult.Blocked
            : SecurityEventRateLimitResult.NotChecked,
        reasonCode: typeof metadata.errorCode === 'string' ? metadata.errorCode : null,
        metadata,
    })
}

export function registerErrorHandler(app: FastifyInstance) {
    app.setErrorHandler(async (error, request, reply) => {
        if (error instanceof AppError) {
            if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 429) {
                recordSecurityFailure(request, error.statusCode, { errorCode: error.code })
            }

            if (error.statusCode >= 500) {
                await reportExternalErrorSafely(error, {
                    requestId: request.id,
                    method: request.method,
                    route: request.routeOptions.url ?? null,
                    statusCode: error.statusCode,
                    errorCode: error.code,
                })
                await recordSystemIncidentSafely({
                    type: SystemIncidentType.ServerError,
                    severity: SystemIncidentSeverity.Critical,
                    title: `Server error: ${error.code} on ${request.routeOptions.url ?? 'unknown route'}`,
                    requestId: request.id,
                    metadata: {
                        errorCode: error.code,
                        method: request.method,
                        route: request.routeOptions.url ?? null,
                        statusCode: error.statusCode,
                    },
                })
            }

            return reply.status(error.statusCode).send(createApiErrorResponse({
                ...error.toResponse(),
                message: getLocalizedErrorMessage(
                    error.code,
                    error.message,
                    getRequestLocale(request),
                ),
                requestId: request.id,
            }))
        }

        if (error instanceof ZodError) {
            void recordSecurityActivitySafely({
                type: SecurityEventType.MalformedRequest,
                severity: SecurityEventSeverity.Warning,
                statusCode: 400,
                request,
                authOutcome: SecurityEventAuthOutcome.Anonymous,
                reasonCode: 'validation_error',
                metadata: { issueCount: error.issues.length },
            })
            const response: ApiErrorResponse = createApiErrorResponse({
                statusCode: 400,
                code: ERROR_CODES.ValidationError,
                message: getLocalizedErrorMessage(
                    ERROR_CODES.ValidationError,
                    'Validation failed.',
                    getRequestLocale(request),
                ),
                details: formatZodIssues(error.issues),
                requestId: request.id,
            })

            return reply.status(400).send(response)
        }

        const fastifyErrorCode = typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code?: unknown }).code)
            : null
        if (fastifyErrorCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
            void recordSecurityActivitySafely({
                type: SecurityEventType.OversizedRequest,
                severity: SecurityEventSeverity.High,
                statusCode: 413,
                request,
                authOutcome: SecurityEventAuthOutcome.Anonymous,
                reasonCode: 'json_body_limit_exceeded',
                metadata: { reason: 'json_body_limit_exceeded' },
            })
            return reply.status(413).send(createApiErrorResponse({
                statusCode: 413,
                code: ERROR_CODES.BadRequest,
                message: getLocalizedErrorMessage(
                    ERROR_CODES.BadRequest,
                    'Request body exceeds the accepted size limit.',
                    getRequestLocale(request),
                ),
                requestId: request.id,
            }))
        }
        if (fastifyErrorCode === 'FST_ERR_CTP_INVALID_JSON_BODY') {
            void recordSecurityActivitySafely({
                type: SecurityEventType.MalformedRequest,
                severity: SecurityEventSeverity.Warning,
                statusCode: 400,
                request,
                authOutcome: SecurityEventAuthOutcome.Anonymous,
                reasonCode: 'invalid_json_body',
                metadata: { reason: 'invalid_json_body' },
            })

            return reply.status(400).send(createApiErrorResponse({
                statusCode: 400,
                code: ERROR_CODES.BadRequest,
                message: getLocalizedErrorMessage(
                    ERROR_CODES.BadRequest,
                    'Invalid JSON request body.',
                    getRequestLocale(request),
                ),
                requestId: request.id,
            }))
        }

        app.log.error(
            {
                err: error,
                requestId: request.id,
            },
            'Unhandled request error',
        )

        await reportExternalErrorSafely(error, {
            requestId: request.id,
            method: request.method,
            route: request.routeOptions.url ?? null,
            statusCode: 500,
        })

        await recordSystemIncidentSafely({
            type: SystemIncidentType.ServerError,
            severity: SystemIncidentSeverity.Critical,
            title: `Unhandled server error on ${request.routeOptions.url ?? 'unknown route'}`,
            requestId: request.id,
            metadata: {
                errorName: error instanceof Error ? error.name : 'UnknownError',
                method: request.method,
                route: request.routeOptions.url ?? null,
                statusCode: 500,
            },
        })

        const response: ApiErrorResponse = createApiErrorResponse({
            statusCode: 500,
            code: ERROR_CODES.InternalServerError,
            message: getLocalizedErrorMessage(
                ERROR_CODES.InternalServerError,
                'Internal server error.',
                getRequestLocale(request),
            ),
            requestId: request.id,
        })

        return reply.status(500).send(response)
    })
}
