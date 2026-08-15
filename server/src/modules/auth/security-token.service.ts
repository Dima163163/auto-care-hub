import { IsNull, type EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    SecurityTokenEntity,
    SecurityTokenPurpose,
} from '../../entities/security-token/security-token.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import {
    createSecurityTokenValue,
    hashSecurityTokenValue,
    assertSecurityTokenInput,
    isSecurityTokenExpired,
} from './security-token-value.js'

const PASSWORD_TOKEN_TTL_MINUTES = 60
export const EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 24 * 60 // 24 hours

type CreateSecurityTokenInput = {
    user: UserEntity
    purpose: SecurityTokenPurpose
    expiresInMinutes?: number
}

export type CreatedSecurityToken = {
    token: string
    expiresAt: Date
}

function getExpiresAt(expiresInMinutes: number) {
    return new Date(Date.now() + expiresInMinutes * 60 * 1000)
}

export async function createSecurityToken({
    user,
    purpose,
    expiresInMinutes = PASSWORD_TOKEN_TTL_MINUTES,
}: CreateSecurityTokenInput): Promise<CreatedSecurityToken> {
    const securityTokenRepository =
        AppDataSource.getRepository(SecurityTokenEntity)
    const now = new Date()
    const token = createSecurityTokenValue()
    const tokenHash = hashSecurityTokenValue(assertSecurityTokenInput(token))
    const expiresAt = getExpiresAt(expiresInMinutes)

    await securityTokenRepository
        .createQueryBuilder()
        .update(SecurityTokenEntity)
        .set({ usedAt: now })
        .where('"userId" = :userId', { userId: user.id })
        .andWhere('purpose = :purpose', { purpose })
        .andWhere('"usedAt" IS NULL')
        .execute()

    await securityTokenRepository.save(
        securityTokenRepository.create({
            userId: user.id,
            purpose,
            tokenHash,
            expiresAt,
            usedAt: null,
        })
    )

    return {
        token,
        expiresAt,
    }
}

export async function findUsableSecurityToken(
    token: string,
    purpose: SecurityTokenPurpose
) {
    const securityTokenRepository =
        AppDataSource.getRepository(SecurityTokenEntity)
    const tokenHash = hashSecurityTokenValue(token)
    const securityToken = await securityTokenRepository.findOne({
        where: {
            tokenHash,
            purpose,
            usedAt: IsNull(),
        },
        relations: {
            user: true,
        },
    })

    if (!securityToken || isSecurityTokenExpired(securityToken.expiresAt)) {
        return null
    }

    return securityToken
}

export async function markSecurityTokenUsed(securityToken: SecurityTokenEntity) {
    const securityTokenRepository =
        AppDataSource.getRepository(SecurityTokenEntity)

    securityToken.usedAt = new Date()

    return securityTokenRepository.save(securityToken)
}

/**
 * Atomically consume a one-time token while running the state change that it
 * authorizes. The row lock closes the double-submit window between a token
 * lookup and the user update (password reset/setup or email verification).
 */
export async function consumeUsableSecurityToken<T>(
    token: string,
    purpose: SecurityTokenPurpose,
    callback: (securityToken: SecurityTokenEntity, manager: EntityManager) => Promise<T>,
): Promise<T | null> {
    // Route schemas bound the token size; hash malformed values as a normal
    // lookup miss so callers return the same 400 as an expired token.
    const tokenHash = hashSecurityTokenValue(token)

    return AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(SecurityTokenEntity)
        const securityToken = await repository
            .createQueryBuilder('securityToken')
            .leftJoinAndSelect('securityToken.user', 'user')
            .where('securityToken.tokenHash = :tokenHash', { tokenHash })
            .andWhere('securityToken.purpose = :purpose', { purpose })
            .andWhere('securityToken.usedAt IS NULL')
            .setLock('pessimistic_write')
            .getOne()

        if (!securityToken || isSecurityTokenExpired(securityToken.expiresAt)) return null

        const result = await callback(securityToken, manager)
        const consumed = await repository.update(
            { id: securityToken.id, usedAt: IsNull() },
            { usedAt: new Date() },
        )
        if ((consumed.affected ?? 0) !== 1) return null
        return result
    })
}

export { SecurityTokenPurpose }
