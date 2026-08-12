import { IsNull } from 'typeorm'

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

export { SecurityTokenPurpose }
