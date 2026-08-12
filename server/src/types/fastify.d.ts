import type { Mailer } from '../shared/mail/mailer.js'

declare module 'fastify' {
    interface FastifyInstance {
        mailer: Mailer
    }
}
