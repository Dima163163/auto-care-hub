import { createHash, randomBytes } from 'node:crypto'
import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { UserMfaFactorEntity } from '../../entities/user-mfa/user-mfa-factor.entity.js'
import { UserMfaRecoveryCodeEntity } from '../../entities/user-mfa/user-mfa-recovery-code.entity.js'
import { UserEntity, UserStatus } from '../../entities/user/user.entity.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { decryptRecordBoundFieldValue, encryptRecordBoundFieldValue } from '../../shared/security/data-encryption/field-encryption.js'
import { generateTotpSecret, matchTotpCode } from './totp.js'

function recoveryCodeHash(userId: string, code: string) {
    return createHash('sha256')
        .update(`autocarehub:mfa-recovery:v1:${userId.toLowerCase()}:${code}`, 'utf8')
        .digest('hex')
}

function normalizeRecoveryCode(input: string) {
    const code = input.trim().replaceAll('-', '').toUpperCase()
    return /^[0-9A-F]{32}$/.test(code) ? code : null
}

export function generateMfaRecoveryCodes(count = 10) {
    if (!Number.isSafeInteger(count) || count < 1 || count > 20) throw new Error('Recovery code count is invalid.')
    return Array.from({ length: count }, () => randomBytes(16).toString('hex').toUpperCase())
}

export async function isPrivilegedMfaProvisioned(userId: string) {
    return AppDataSource.getRepository(UserMfaFactorEntity).existsBy({ userId })
}

/** Operator controlled enrollment. Never return the secret after this call. */
export async function provisionPrivilegedMfa(userId: string) {
    const secret = generateTotpSecret()
    const recoveryCodes = generateMfaRecoveryCodes()
    await AppDataSource.transaction(async (manager) => {
        const users = manager.getRepository(UserEntity)
        const user = await users.createQueryBuilder('user')
            .where('user.id = :userId', { userId })
            .setLock('pessimistic_write')
            .getOne()
        if (!user || !isAdminRole(user.role) || user.status !== UserStatus.Active) {
            throw new Error('An active privileged account is required for MFA enrollment.')
        }
        const factors = manager.getRepository(UserMfaFactorEntity)
        if (await factors.existsBy({ userId })) throw new Error('MFA is already enrolled for this account.')
        await factors.save(factors.create({
            userId,
            secretCiphertext: JSON.stringify(encryptRecordBoundFieldValue(
                'user_mfa_factors', 'secret', secret, { rowId: userId, ownerId: userId },
            )),
            lastAcceptedCounter: -1,
        }))
        const codes = manager.getRepository(UserMfaRecoveryCodeEntity)
        await codes.save(recoveryCodes.map((code) => codes.create({
            userId,
            codeHash: recoveryCodeHash(userId, code),
            consumedAt: null,
        })))
    })
    return { secret, recoveryCodes }
}

/** Atomically consumes a TOTP time step or recovery code. */
export async function verifyPrivilegedMfa(userId: string, code: string, now = Date.now(), existingManager?: EntityManager) {
    const consume = async (manager: EntityManager) => {
        const factors = manager.getRepository(UserMfaFactorEntity)
        const factor = await factors.createQueryBuilder('factor')
            .where('factor.user_id = :userId', { userId })
            .setLock('pessimistic_write')
            .getOne()
        if (!factor) return false

        if (/^\d{6}$/.test(code)) {
            const secret = decryptRecordBoundFieldValue<string>(
                'user_mfa_factors', 'secret', factor.secretCiphertext,
                { rowId: userId, ownerId: userId },
            )
            const counter = matchTotpCode(secret, code, factor.lastAcceptedCounter, now)
            if (counter === null) return false
            factor.lastAcceptedCounter = counter
            await factors.save(factor)
            return true
        }

        const recoveryCode = normalizeRecoveryCode(code)
        if (!recoveryCode) return false
        const codes = manager.getRepository(UserMfaRecoveryCodeEntity)
        const existing = await codes.createQueryBuilder('recovery')
            .where('recovery.user_id = :userId', { userId })
            .andWhere('recovery.code_hash = :codeHash', { codeHash: recoveryCodeHash(userId, recoveryCode) })
            .andWhere('recovery.consumed_at IS NULL')
            .setLock('pessimistic_write')
            .getOne()
        if (!existing) return false
        existing.consumedAt = new Date(now)
        await codes.save(existing)
        return true
    }
    return existingManager ? consume(existingManager) : AppDataSource.transaction(consume)
}
