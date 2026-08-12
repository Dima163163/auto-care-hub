import type { FastifyBaseLogger } from 'fastify'

import type { EnvConfig } from '../../config/env.js'
import type { Mailer } from './mailer.js'
import { LoggerMailer } from './logger-mailer.js'
import { SmtpMailer } from './smtp-mailer.js'

export function createMailer(
    config: EnvConfig['mail'] | undefined,
    logger: FastifyBaseLogger
): Mailer {
    if (!config || typeof config !== 'object' || !('mode' in config)) {
        throw new Error('Mail configuration is missing or invalid.')
    }

    if (config.mode === 'logger') {
        return new LoggerMailer(logger)
    }

    if (
        config.mode !== 'smtp'
        || !config.host
        || !Number.isInteger(config.port)
        || config.port < 1
        || !config.user
        || !config.password
        || !config.from
    ) {
        throw new Error('SMTP mail configuration is incomplete or invalid.')
    }

    return new SmtpMailer(config)
}
