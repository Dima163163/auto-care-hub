import nodemailer from 'nodemailer'

import type { Mailer, MailMessage } from './mailer.js'

type SmtpMailerConfig = {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
    from: string
}

export class SmtpMailer implements Mailer {
    private readonly transporter

    constructor(private readonly config: SmtpMailerConfig) {
        this.transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
        })
    }

    async send(message: MailMessage) {
        await this.transporter.sendMail({
            from: this.config.from,
            ...message,
        })
    }

    async verify() {
        await this.transporter.verify()
    }
}
