import { hashSecurityTokenValue } from '../auth/security-token-value.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { logError } from '../../shared/observability/logger.js'
import { enqueueOutboxEvent } from './outbox.service.js'
import { encryptOutboxSecret } from './outbox-secret.js'

type EnqueuePasswordResetEmailInput = {
    email: string
    expiresAt: Date
    frontendOrigin: string
    token: string
    locale?: SupportedLocale
}

export async function enqueuePasswordResetEmailSafely(input: EnqueuePasswordResetEmailInput) {
    try {
        await enqueueOutboxEvent({
            type: 'email.send',
            idempotencyKey: `email:password-reset:${hashSecurityTokenValue(input.token)}`,
            payload: {
                template: 'password_reset',
                email: input.email,
                expiresAt: input.expiresAt.toISOString(),
                frontendOrigin: input.frontendOrigin,
                encryptedToken: encryptOutboxSecret(input.token),
                locale: input.locale ?? null,
            },
        })
    } catch (error) {
        logError('Failed to enqueue password reset email', error, {
            template: 'password_reset',
        })
    }
}
