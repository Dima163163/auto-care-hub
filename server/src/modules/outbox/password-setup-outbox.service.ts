import { hashSecurityTokenValue } from '../auth/security-token-value.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { logError } from '../../shared/observability/logger.js'
import { enqueueOutboxEvent } from './outbox.service.js'
import { encryptOutboxSecret } from './outbox-secret.js'

type EnqueuePasswordSetupEmailInput = {
    email: string
    expiresAt: Date
    frontendOrigin: string
    token: string
    locale?: SupportedLocale
}

export async function enqueuePasswordSetupEmailSafely(input: EnqueuePasswordSetupEmailInput) {
    try {
        await enqueueOutboxEvent({
            type: 'email.send',
            idempotencyKey: `email:password-setup:${hashSecurityTokenValue(input.token)}`,
            payload: {
                template: 'password_setup',
                email: input.email,
                expiresAt: input.expiresAt.toISOString(),
                frontendOrigin: input.frontendOrigin,
                encryptedToken: encryptOutboxSecret(input.token),
                locale: input.locale ?? null,
            },
        })
    } catch (error) {
        logError('Failed to enqueue password setup email', error, {
            template: 'password_setup',
        })
    }
}
