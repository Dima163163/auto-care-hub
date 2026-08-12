import type { FastifyBaseLogger } from 'fastify'

import type { Mailer, MailMessage } from './mailer.js'
import { sanitizeLogMetadata } from '../observability/sensitive-data.js'

export class LoggerMailer implements Mailer {
    constructor(private readonly logger: FastifyBaseLogger) {}

    async send(message: MailMessage) {
        this.logger.info(
            sanitizeLogMetadata({
                mail: {
                    to: message.to,
                    subject: message.subject,
                    text: message.text,
                    html: message.html,
                },
            }),
            'Development email'
        )
    }

    async verify() {
        return Promise.resolve()
    }
}
