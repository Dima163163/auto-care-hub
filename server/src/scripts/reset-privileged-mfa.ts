import { AppDataSource } from '../database/data-source.js'
import { UserEntity } from '../entities/user/user.entity.js'
import { normalizeAuthEmail } from '../modules/auth/email-policy.js'
import { resetPrivilegedMfa } from '../modules/auth/privileged-mfa.service.js'
import { createTotpUri } from '../modules/auth/totp.js'

async function readHiddenCode(label: string): Promise<string> {
    process.stdout.write(`${label} MFA code (input hidden): `)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    return new Promise((resolve, reject) => {
        let code = ''
        const finish = (error?: Error) => {
            process.stdin.off('data', onData)
            process.stdin.setRawMode(false)
            process.stdin.pause()
            process.stdout.write('\n')
            if (error) reject(error)
            else resolve(code)
        }
        const onData = (chunk: Buffer) => {
            for (const character of chunk.toString('utf8')) {
                if (character === '\u0003') return finish(new Error('MFA reset cancelled.'))
                if (character === '\r' || character === '\n') return finish()
                if (character === '\u007f' || character === '\b') {
                    code = code.slice(0, -1)
                } else if (/^[A-Za-z0-9-]$/.test(character) && code.length < 64) {
                    code += character
                }
            }
        }
        process.stdin.on('data', onData)
    })
}

async function main() {
    const [targetArg, firstArg, secondArg, ticketId] = process.argv.slice(2)
    if (!process.stdin.isTTY || !process.stdout.isTTY || process.argv.length !== 6
        || !targetArg || !firstArg || !secondArg || !ticketId) {
        throw new Error('Run in a private terminal: npm run mfa:reset -- target@example.com approver1@example.com approver2@example.com TICKET-123')
    }
    const targetEmail = normalizeAuthEmail(targetArg)
    const firstEmail = normalizeAuthEmail(firstArg)
    const secondEmail = normalizeAuthEmail(secondArg)
    if (new Set([targetEmail, firstEmail, secondEmail]).size !== 3) {
        throw new Error('Target and approver accounts must be distinct.')
    }
    await AppDataSource.initialize()
    try {
        const users = AppDataSource.getRepository(UserEntity)
        const target = await users.findOne({ where: { email: targetEmail } })
        const first = await users.findOne({ where: { email: firstEmail } })
        const second = await users.findOne({ where: { email: secondEmail } })
        if (!target || !first || !second) throw new Error('A recovery account was not found.')
        const firstCode = await readHiddenCode(firstEmail)
        const secondCode = await readHiddenCode(secondEmail)
        const { secret, recoveryCodes } = await resetPrivilegedMfa({
            targetUserId: target.id,
            approvals: [{ userId: first.id, code: firstCode }, { userId: second.id, code: secondCode }],
            ticketId,
        })
        process.stdout.write(`Authenticator URI for ${targetEmail} (deliver privately):\n${createTotpUri(secret, targetEmail)}\n`)
        process.stdout.write(`One-time recovery codes (store offline, then clear terminal):\n${recoveryCodes.join('\n')}\n`)
    } finally {
        await AppDataSource.destroy()
    }
}

main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'MFA reset failed.'}\n`)
    process.exitCode = 1
})
