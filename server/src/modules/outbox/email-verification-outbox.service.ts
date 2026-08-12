import { hashSecurityTokenValue } from '../auth/security-token-value.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { logError } from '../../shared/observability/logger.js'
import { enqueueOutboxEvent } from './outbox.service.js'
import { encryptOutboxSecret } from './outbox-secret.js'

type EnqueueEmailVerificationInput = {
    email: string
    expiresAt: Date
    frontendOrigin: string
    token: string
    locale?: SupportedLocale
}

export async function enqueueEmailVerificationSafely(input: EnqueueEmailVerificationInput) {
    try {
        await enqueueOutboxEvent({
            type: 'email.send',
            idempotencyKey: `email:verification:${hashSecurityTokenValue(input.token)}`,
            payload: {
                template: 'email_verification',
                email: input.email,
                expiresAt: input.expiresAt.toISOString(),
                frontendOrigin: input.frontendOrigin,
                encryptedToken: encryptOutboxSecret(input.token),
                locale: input.locale ?? null,
            },
        })
    } catch (error) {
        logError('Failed to enqueue email verification', error, {
            template: 'email_verification',
        })
    }
}
