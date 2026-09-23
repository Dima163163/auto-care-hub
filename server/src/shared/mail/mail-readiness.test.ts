import { describe, expect, it, vi } from 'vitest'

import type { Mailer } from './mailer.js'
import { MailReadinessTracker, verifyMailerInBackground } from './mail-readiness.js'

function createMailer(verify: () => Promise<void>): Mailer {
    return {
        send: vi.fn().mockResolvedValue(undefined),
        verify,
    }
}

describe('mail readiness verification', () => {
    it('starts without waiting for the SMTP provider and records eventual success', async () => {
        const tracker = new MailReadinessTracker()
        const logger = { info: vi.fn(), warn: vi.fn() }
        let resolveVerification!: () => void
        const mailer = createMailer(() => new Promise<void>((resolve) => {
            resolveVerification = resolve
        }))

        verifyMailerInBackground(mailer, tracker, logger, 1_000)

        expect(tracker.getProbe().status).toBe('checking')
        await vi.waitFor(() => expect(resolveVerification).toBeTypeOf('function'))
        resolveVerification()
        await vi.waitFor(() => expect(tracker.getProbe().status).toBe('ok'))
        expect(logger.info).toHaveBeenCalledWith('SMTP transport verified.')
    })

    it('marks a failed SMTP verification as degraded without throwing', async () => {
        const tracker = new MailReadinessTracker()
        const logger = { info: vi.fn(), warn: vi.fn() }
        const mailer = createMailer(() => Promise.reject(new Error('private SMTP details')))

        expect(() => verifyMailerInBackground(mailer, tracker, logger, 1_000)).not.toThrow()
        await vi.waitFor(() => expect(tracker.getProbe()).toMatchObject({
            status: 'failed',
            reason: 'unavailable',
        }))
        expect(logger.warn).toHaveBeenCalledWith('SMTP transport verification failed; email delivery is degraded.')
        expect(logger.warn.mock.calls.flat().join(' ')).not.toContain('private SMTP details')
    })

    it('contains a synchronous verification failure as well', async () => {
        const tracker = new MailReadinessTracker()
        const logger = { info: vi.fn(), warn: vi.fn() }
        const mailer = createMailer(() => {
            throw new Error('private SMTP details')
        })

        expect(() => verifyMailerInBackground(mailer, tracker, logger, 1_000)).not.toThrow()
        await vi.waitFor(() => expect(tracker.getProbe().status).toBe('failed'))
    })

    it('marks a hung verification failed after the bounded timeout', async () => {
        vi.useFakeTimers()
        try {
            const tracker = new MailReadinessTracker()
            const logger = { info: vi.fn(), warn: vi.fn() }
            const mailer = createMailer(() => new Promise<void>(() => undefined))

            verifyMailerInBackground(mailer, tracker, logger, 100)
            await vi.advanceTimersByTimeAsync(100)

            expect(tracker.getProbe()).toMatchObject({ status: 'failed', reason: 'unavailable' })
            expect(logger.warn).toHaveBeenCalledWith('SMTP transport verification timed out; email delivery is degraded.')
        } finally {
            vi.useRealTimers()
        }
    })
})
