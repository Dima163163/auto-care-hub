import type { FastifyInstance } from 'fastify'

import { ERROR_CODES } from './error-codes.js'
import type { ApiErrorResponse } from './types.js'
import { getRequestLocale } from '../i18n/request-locale.js'
import { getLocalizedErrorMessage } from '../i18n/error-message.js'
import {
    SecurityEventAuthOutcome,
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { recordSecurityActivitySafely } from '../../modules/auth/security-event-stream.js'

export function registerNotFoundHandler(app: FastifyInstance) {
    app.setNotFoundHandler((request, reply) => {
        void recordSecurityActivitySafely({
            type: SecurityEventType.RouteScan,
            severity: SecurityEventSeverity.Info,
            statusCode: 404,
            request,
            authOutcome: SecurityEventAuthOutcome.Anonymous,
            reasonCode: 'route_not_found',
            metadata: { path: request.url.split('?')[0] },
        })
        const response: ApiErrorResponse = {
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: getLocalizedErrorMessage(
                ERROR_CODES.NotFound,
                'The requested route was not found.',
                getRequestLocale(request),
            ),
            requestId: request.id,
        }

        return reply.status(404).send(response)
    })
}
