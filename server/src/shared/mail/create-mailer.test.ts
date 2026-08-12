import type { FastifyBaseLogger } from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { createMailer } from './create-mailer'
import { LoggerMailer } from './logger-mailer'
import { SmtpMailer } from './smtp-mailer'

const logger = {
    info: vi.fn(),
} as unknown as FastifyBaseLogger

describe('createMailer', () => {
    it('uses the logger transport for development config', () => {
        expect(
            createMailer(
                {
                    mode: 'logger',
                },
                logger
            )
        ).toBeInstanceOf(LoggerMailer)
    })

    it('uses the SMTP transport for production config', () => {
        expect(
            createMailer(
                {
                    mode: 'smtp',
                    host: 'smtp.example.com',
                    port: 587,
                    secure: false,
                    user: 'smtp-user',
                    password: 'smtp-password',
                    from: 'AutoCare Hub <no-reply@example.com>',
                },
                logger
            )
        ).toBeInstanceOf(SmtpMailer)
    })

    it('fails with a clear error when mail configuration is missing', () => {
        expect(() => createMailer(undefined, logger)).toThrow(
            'Mail configuration is missing or invalid.',
        )
    })

    it('fails with a clear error when SMTP configuration is incomplete', () => {
        expect(() => createMailer({
            mode: 'smtp',
            host: '',
            port: 587,
            secure: false,
            user: 'smtp-user',
            password: 'smtp-password',
            from: 'AutoCare Hub <no-reply@example.com>',
        }, logger)).toThrow('SMTP mail configuration is incomplete or invalid.')
    })

    it('rejects unknown runtime mail modes instead of throwing a property error', () => {
        expect(() => createMailer({ mode: 'unknown' } as never, logger)).toThrow(
            'SMTP mail configuration is incomplete or invalid.',
        )
    })
})
