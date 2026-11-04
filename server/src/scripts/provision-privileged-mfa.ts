import { AppDataSource } from '../database/data-source.js'
import { UserEntity } from '../entities/user/user.entity.js'
import { normalizeAuthEmail } from '../modules/auth/email-policy.js'
import { provisionPrivilegedMfa } from '../modules/auth/privileged-mfa.service.js'
import { createTotpUri } from '../modules/auth/totp.js'

async function main() {
    const emailArg = process.argv[2]
    if (!process.stdin.isTTY || !process.stdout.isTTY || process.argv.length !== 3 || !emailArg) {
        throw new Error('Run in a private interactive terminal: npm run mfa:provision -- admin@example.com')
    }
    const email = normalizeAuthEmail(emailArg)
    await AppDataSource.initialize()
    try {
        const user = await AppDataSource.getRepository(UserEntity).findOne({ where: { email } })
        if (!user) throw new Error('Account not found.')
        const { secret, recoveryCodes } = await provisionPrivilegedMfa(user.id)
        process.stdout.write(`Authenticator URI (show privately to ${email}):\n${createTotpUri(secret, email)}\n`)
        process.stdout.write(`One-time recovery codes (store offline, then clear terminal):\n${recoveryCodes.join('\n')}\n`)
    } finally {
        await AppDataSource.destroy()
    }
}

main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'MFA provisioning failed.'}\n`)
    process.exitCode = 1
})
