import type { FastifyBaseLogger } from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { LoggerMailer } from './logger-mailer.js'

describe('logger mailer', () => {
    it('redacts one-time token URLs from development log payloads', async () => {
        const logger = { info: vi.fn() } as unknown as FastifyBaseLogger
        const mailer = new LoggerMailer(logger)

        await mailer.send({
            to: 'client@example.com',
            subject: 'Set password',
            text: 'Open https://autocarehub.example/password/setup?token=one-time-secret',
            html: '<a href="https://autocarehub.example/password/setup?token=one-time-secret">Open</a>',
        })

        expect(logger.info).toHaveBeenCalledWith({
            mail: {
                to: '[REDACTED_EMAIL]',
                subject: 'Set password',
                text: 'Open https://autocarehub.example/password/setup?token=[REDACTED]',
                html: '<a href="https://autocarehub.example/password/setup?token=[REDACTED]">Open</a>',
            },
        }, 'Development email')
        expect(JSON.stringify(logger.info.mock.calls)).not.toContain('one-time-secret')
    })
})
