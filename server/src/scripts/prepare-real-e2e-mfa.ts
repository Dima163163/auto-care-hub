import { writeFile } from 'node:fs/promises'

import { env } from '../config/env.js'
import { AppDataSource } from '../database/data-source.js'
import { UserEntity } from '../entities/user/user.entity.js'
import { provisionPrivilegedMfa } from '../modules/auth/privileged-mfa.service.js'
import { DEMO_USERS } from './demo-fixtures.js'

const REAL_E2E_DATABASE = 'autocarehub_real_e2e'

async function main() {
    const file = process.env.REAL_E2E_MFA_CODES_FILE
    if (env.nodeEnv === 'production' || env.database.name !== REAL_E2E_DATABASE
        || process.env.DEMO_RESET_CONFIRM_DATABASE !== REAL_E2E_DATABASE || !file) {
        throw new Error('Real E2E MFA preparation requires the confirmed disposable test database and a private output file.')
    }

    await AppDataSource.initialize()
    try {
        const repository = AppDataSource.getRepository(UserEntity)
        const codes: Record<string, string[]> = {}
        for (const email of [DEMO_USERS.admin.email, DEMO_USERS.superAdmin.email]) {
            const user = await repository.findOneByOrFail({ email })
            const provisioned = await provisionPrivilegedMfa(user.id)
            codes[email] = provisioned.recoveryCodes
        }
        await writeFile(file, JSON.stringify(codes), { flag: 'wx', mode: 0o600 })
        console.info('Real E2E privileged MFA factors prepared for two demo accounts.')
    } finally {
        await AppDataSource.destroy()
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Real E2E MFA preparation failed.')
    process.exitCode = 1
})
