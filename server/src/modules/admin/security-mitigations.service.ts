import { AppDataSource } from '../../database/data-source.js'
import {
    SecurityMitigationEntity,
    SecurityMitigationKind,
} from '../../entities/security-mitigation/security-mitigation.entity.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    assertSecurityMitigationTtl,
    getExtendedSecurityMitigationExpiry,
    getSecurityMitigationState,
} from './security-mitigation-policy.js'
import {
    cacheSecurityMitigation,
    removeCachedSecurityMitigation,
} from './security-mitigation-guard.js'
import {
    normalizeSecurityMitigationCreateInput,
    normalizeSecurityMitigationExtensionMinutes,
    normalizeSecurityMitigationIpInput,
    normalizeSecurityMitigationsQuery,
    normalizeSecurityMitigationUuid,
} from './security-mitigation-input-policy.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'

export type SecurityMitigationResponse = {
    id: string
    kind: SecurityMitigationKind
    displayValue: string
    reason: string
    expiresAt: string
    revokedAt: string | null
    createdBy: string
    revokedBy: string | null
    createdAt: string
    status: 'active' | 'expired' | 'revoked'
}

function assertSecurityMitigationAccess(user: UserEntity) {
    if (isSuperAdmin(user)) return

    throw new AppError({
        statusCode: 403,
        code: ERROR_CODES.Forbidden,
        message: 'Only super admin can manage security mitigations.',
    })
}

function toSecurityMitigationResponse(
    mitigation: SecurityMitigationEntity,
    now = Date.now(),
): SecurityMitigationResponse {
    return {
        id: mitigation.id,
        kind: mitigation.kind,
        displayValue: mitigation.displayValue,
        reason: mitigation.reason,
        expiresAt: mitigation.expiresAt.toISOString(),
        revokedAt: mitigation.revokedAt?.toISOString() ?? null,
        createdBy: mitigation.createdBy,
        revokedBy: mitigation.revokedBy,
        createdAt: mitigation.createdAt.toISOString(),
        status: getSecurityMitigationState(mitigation.expiresAt, mitigation.revokedAt, now),
    }
}

export function normalizeSecurityMitigationIp(value: string) {
    const normalized = normalizeSecurityMitigationIpInput(value)
    if (!normalized) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Provide a valid IP address for the temporary block.',
        })
    }

    return normalized
}

export async function getSecurityMitigations(
    user: UserEntity,
    input: unknown = { status: 'active', kind: SecurityMitigationKind.IpBlock },
): Promise<SecurityMitigationResponse[] | CursorPage<SecurityMitigationResponse>> {
    assertSecurityMitigationAccess(user)
    const normalizedInput = normalizeSecurityMitigationsQuery(input)
    if (!normalizedInput) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Security mitigation query is invalid.',
        })
    }
    const isPaginated = isCursorPaginationRequested(normalizedInput)
    const limit = getCursorLimit(normalizedInput.limit)
    const now = new Date()
    const repository = AppDataSource.getRepository(SecurityMitigationEntity)
    const query = repository.createQueryBuilder('mitigation')
        .where('mitigation.kind = :kind', { kind: normalizedInput.kind })

    if (normalizedInput.ipAddress) {
        query.andWhere('mitigation.value = :value', {
            value: normalizeSecurityMitigationIp(normalizedInput.ipAddress).normalizedValue,
        })
    }
    if (normalizedInput.status === 'active') {
        query.andWhere('mitigation.revokedAt IS NULL')
            .andWhere('mitigation.expiresAt > :now', { now })
    } else if (normalizedInput.status === 'expired') {
        query.andWhere('mitigation.revokedAt IS NULL')
            .andWhere('mitigation.expiresAt <= :now', { now })
    } else {
        query.andWhere('mitigation.revokedAt IS NOT NULL')
    }
    if (normalizedInput.cursor) {
        const cursor = decodeCursor(normalizedInput.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        query.andWhere(
            '(mitigation.createdAt < :cursorCreatedAt OR (mitigation.createdAt = :cursorCreatedAt AND mitigation.id < :cursorId))',
            { cursorCreatedAt, cursorId: cursor.id },
        )
    }

    const mitigations = await query
        .orderBy('mitigation.createdAt', 'DESC')
        .addOrderBy('mitigation.id', 'DESC')
        .take(isPaginated ? limit + 1 : 100)
        .getMany()
    const response = mitigations.map((item) => toSecurityMitigationResponse(item, now.getTime()))

    if (!isPaginated) return response
    return toCursorPage(response, limit, (item) => ({
        createdAt: item.createdAt,
        id: item.id,
    }))
}

export async function createSecurityMitigation(
    user: UserEntity,
    input: unknown,
) {
    assertSecurityMitigationAccess(user)
    const normalizedInput = normalizeSecurityMitigationCreateInput(input)
    if (!normalizedInput) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Security mitigation payload is invalid.',
        })
    }
    const { displayValue, normalizedValue } = normalizedInput.ipAddress
    const reason = normalizedInput.reason
    const ttlMs = assertSecurityMitigationTtl(normalizedInput.ttlMinutes * 60_000)
    const repository = AppDataSource.getRepository(SecurityMitigationEntity)
    const now = new Date()
    const existing = await repository.createQueryBuilder('mitigation')
        .where('mitigation.value = :value', { value: normalizedValue })
        .andWhere('mitigation.revokedAt IS NULL')
        .andWhere('mitigation.expiresAt > :now', { now })
        .getOne()
    if (existing) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'An active block already exists for this IP address.' })
    }

    const mitigation = await repository.save(repository.create({
        kind: normalizedInput.kind,
        value: normalizedValue,
        displayValue,
        reason,
        expiresAt: new Date(now.getTime() + ttlMs),
        revokedAt: null,
        createdBy: user.id,
        revokedBy: null,
    }))
    cacheSecurityMitigation(mitigation.value, mitigation.expiresAt)
    return toSecurityMitigationResponse(mitigation, now.getTime())
}

export async function revokeSecurityMitigation(user: UserEntity, id: unknown) {
    assertSecurityMitigationAccess(user)
    const normalizedId = normalizeSecurityMitigationUuid(id)
    if (!normalizedId) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Security mitigation id must be a valid UUID.',
        })
    }
    const repository = AppDataSource.getRepository(SecurityMitigationEntity)
    const mitigation = await repository.findOne({ where: { id: normalizedId } })
    if (!mitigation) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Security mitigation not found.' })
    }
    if (mitigation.revokedAt === null) {
        mitigation.revokedAt = new Date()
        mitigation.revokedBy = user.id
        await repository.save(mitigation)
        removeCachedSecurityMitigation(mitigation.value)
    }
    return toSecurityMitigationResponse(mitigation)
}

export async function extendSecurityMitigation(
    user: UserEntity,
    id: unknown,
    extensionMinutes: unknown,
) {
    assertSecurityMitigationAccess(user)
    const normalizedId = normalizeSecurityMitigationUuid(id)
    const normalizedExtensionMinutes = normalizeSecurityMitigationExtensionMinutes(extensionMinutes)
    if (!normalizedId || normalizedExtensionMinutes === null) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Security mitigation extension input is invalid.',
        })
    }
    const extensionMs = assertSecurityMitigationTtl(normalizedExtensionMinutes * 60_000)
    const now = new Date()
    const mitigation = await AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(SecurityMitigationEntity)
        const current = await repository.findOne({
            where: { id: normalizedId },
            lock: { mode: 'pessimistic_write' },
        })
        if (!current) {
            throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Security mitigation not found.' })
        }
        if (current.revokedAt !== null) {
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Revoked security mitigations cannot be extended.' })
        }

        const nextExpiry = getExtendedSecurityMitigationExpiry(current.expiresAt, extensionMs, now.getTime())
        if (!nextExpiry) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'The mitigation is expired or the extension would exceed the 24-hour recovery window.',
            })
        }

        current.expiresAt = nextExpiry
        return repository.save(current)
    })

    cacheSecurityMitigation(mitigation.value, mitigation.expiresAt)
    return toSecurityMitigationResponse(mitigation, now.getTime())
}

export { assertSecurityMitigationAccess, toSecurityMitigationResponse }
