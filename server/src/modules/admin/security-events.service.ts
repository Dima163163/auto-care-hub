import { AppDataSource } from '../../database/data-source.js'
import { SecurityEventEntity, SecurityEventType } from '../../entities/security-event/security-event.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { normalizeSecurityEventsQuery } from './security-events-input-policy.js'

export type SecurityEventResponse = {
    id: string
    userId: string | null
    type: SecurityEventType
    failedLoginAttempts: number | null
    lockedUntil: string | null
    ipAddress: string | null
    userAgent: string | null
    correlationId: string | null
    createdAt: string
}

function assertSecurityEventReader(user: UserEntity) {
    if (isSuperAdmin(user)) return

    throw new AppError({
        statusCode: 403,
        code: ERROR_CODES.Forbidden,
        message: 'Only super admin can view security events.',
    })
}

function redactIpAddress(value: string | null) {
    if (!value) return null

    if (value.includes('.')) {
        const parts = value.split('.')
        if (parts.length === 4) {
            parts[3] = '*'
            return parts.join('.')
        }
    }

    if (value.includes(':')) {
        const parts = value.split(':')
        return `${parts.slice(0, 4).join(':')}:*`
    }

    return '[REDACTED]'
}

export function toSecurityEventResponse(event: SecurityEventEntity): SecurityEventResponse {
    return {
        id: event.id,
        userId: event.userId,
        type: event.type,
        failedLoginAttempts: event.failedLoginAttempts,
        lockedUntil: event.lockedUntil?.toISOString() ?? null,
        ipAddress: redactIpAddress(event.ipAddress),
        userAgent: event.userAgent,
        correlationId: event.correlationId,
        createdAt: event.createdAt.toISOString(),
    }
}

export async function getSecurityEvents(
    user: UserEntity,
    input: unknown = {},
): Promise<SecurityEventResponse[] | CursorPage<SecurityEventResponse>> {
    assertSecurityEventReader(user)

    const normalizedInput = normalizeSecurityEventsQuery(input)
    if (!normalizedInput) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Security events query is invalid.',
        })
    }

    const repository = AppDataSource.getRepository(SecurityEventEntity)
    const isPaginated = isCursorPaginationRequested(normalizedInput)
    const limit = getCursorLimit(normalizedInput.limit)
    const query = repository.createQueryBuilder('securityEvent')

    if (normalizedInput.type) {
        query.andWhere('securityEvent.type = :type', { type: normalizedInput.type })
    }

    if (normalizedInput.userId) {
        query.andWhere('securityEvent.userId = :userId', { userId: normalizedInput.userId })
    }

    if (normalizedInput.cursor) {
        const cursor = decodeCursor(normalizedInput.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        query.andWhere(
            '(securityEvent.createdAt < :cursorCreatedAt OR (securityEvent.createdAt = :cursorCreatedAt AND securityEvent.id < :cursorId))',
            { cursorCreatedAt, cursorId: cursor.id },
        )
    }

    const events = await query
        .orderBy('securityEvent.createdAt', 'DESC')
        .addOrderBy('securityEvent.id', 'DESC')
        .take(isPaginated ? limit + 1 : 100)
        .getMany()
    const mappedEvents = events.map(toSecurityEventResponse)

    return isPaginated
        ? toCursorPage(mappedEvents, limit, (event) => ({
            createdAt: event.createdAt,
            id: event.id,
        }))
        : mappedEvents
}
