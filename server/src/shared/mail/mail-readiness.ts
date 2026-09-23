import type { Mailer } from './mailer.js'

export type MailReadinessStatus = 'checking' | 'ok' | 'failed' | 'skipped'

export type MailReadinessProbe = {
    status: MailReadinessStatus
    latencyMs: number
    reason?: 'unavailable' | 'not_configured'
}

export class MailReadinessTracker {
    private probe: MailReadinessProbe = {
        status: 'skipped',
        latencyMs: 0,
        reason: 'not_configured',
    }

    markChecking() {
        this.probe = { status: 'checking', latencyMs: 0 }
    }

    markAvailable(latencyMs: number) {
        this.probe = { status: 'ok', latencyMs: Math.max(0, Math.round(latencyMs)) }
    }

    markUnavailable(latencyMs: number) {
        this.probe = {
            status: 'failed',
            latencyMs: Math.max(0, Math.round(latencyMs)),
            reason: 'unavailable',
        }
    }

    markNotConfigured() {
        this.probe = { status: 'skipped', latencyMs: 0, reason: 'not_configured' }
    }

    getProbe(): MailReadinessProbe {
        return { ...this.probe }
    }
}

type MailVerificationLogger = {
    info: (message: string) => void
    warn: (message: string) => void
}

export const mailReadiness = new MailReadinessTracker()

const DEFAULT_MAIL_VERIFICATION_TIMEOUT_MS = 8_000

/**
 * Verify the SMTP transport in the background: a transient DNS/provider outage
 * must not prevent the API from starting, while readiness remains observable.
 */
export function verifyMailerInBackground(
    mailer: Mailer,
    tracker: MailReadinessTracker,
    logger: MailVerificationLogger,
    timeoutMs = DEFAULT_MAIL_VERIFICATION_TIMEOUT_MS,
) {
    const startedAt = Date.now()
    let timedOut = false
    tracker.markChecking()

    const timeout = setTimeout(() => {
        timedOut = true
        tracker.markUnavailable(timeoutMs)
        logger.warn('SMTP transport verification timed out; email delivery is degraded.')
    }, timeoutMs)
    timeout.unref?.()

    void Promise.resolve().then(() => mailer.verify()).then(
        () => {
            clearTimeout(timeout)
            tracker.markAvailable(Date.now() - startedAt)
            if (timedOut) {
                logger.info('SMTP transport verification recovered after a timeout.')
                return
            }
            logger.info('SMTP transport verified.')
        },
        () => {
            clearTimeout(timeout)
            tracker.markUnavailable(Date.now() - startedAt)
            if (!timedOut) {
                logger.warn('SMTP transport verification failed; email delivery is degraded.')
            }
        },
    )
}
