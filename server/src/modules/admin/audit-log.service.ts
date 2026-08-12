import type { FastifyRequest } from 'fastify'
import type { EntityManager } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AuditAction, AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import type { AdminAuditLogsQuery } from './admin.schemas.js'
import type { AuditLogsExportQuery } from './admin.schemas.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import {
    assertAuditMetadataWithinBounds,
    normalizeAuditAction,
} from './audit-log-guards.js'
import {
    MAX_AUDIT_TARGET_ID_LENGTH,
    MAX_AUDIT_TARGET_TYPE_LENGTH,
    normalizeAuditTarget,
} from './audit-target-policy.js'
import { boundAuditCsvCell, getAuditExportRowLimit } from './audit-export-policy.js'
import { normalizeAdminSearch } from './admin-query-policy.js'
import {
    MAX_REQUEST_CORRELATION_ID_LENGTH,
    MAX_REQUEST_IP_LENGTH,
    MAX_REQUEST_USER_AGENT_LENGTH,
    normalizeRequestHeader,
} from '../../shared/http/request-header-policy.js'

type RecordAuditLogInput = {
    actorId?: string | null
    action: AuditAction | string
    targetId?: string
    targetType?: string
    metadata?: Record<string, unknown>
    request?: FastifyRequest
    manager?: EntityManager
}

export async function recordAuditLog(input: RecordAuditLogInput) {
    const auditLogRepository = (input.manager ?? AppDataSource.manager).getRepository(AuditLogEntity)

    const auditLog = auditLogRepository.create({
        actorId: input.actorId,
        action: normalizeAuditAction(input.action),
        targetId: normalizeAuditTarget(input.targetId, MAX_AUDIT_TARGET_ID_LENGTH, 'target id'),
        targetType: normalizeAuditTarget(input.targetType, MAX_AUDIT_TARGET_TYPE_LENGTH, 'target type'),
        metadata: assertAuditMetadataWithinBounds(input.metadata ?? {}),
        ipAddress: normalizeRequestHeader(input.request?.ip, MAX_REQUEST_IP_LENGTH),
        userAgent: normalizeRequestHeader(input.request?.headers['user-agent'], MAX_REQUEST_USER_AGENT_LENGTH),
        correlationId: normalizeRequestHeader(input.request?.id, MAX_REQUEST_CORRELATION_ID_LENGTH),
    })

    return auditLogRepository.save(auditLog)
}

export async function getAuditLogs(
    admin: UserEntity,
    input: AdminAuditLogsQuery = {},
): Promise<AuditLogEntity[] | CursorPage<AuditLogEntity>> {
    assertAuditAdmin(admin)
    // Only admins can access this, but the route should already be protected
    const auditLogRepository = AppDataSource.getRepository(AuditLogEntity)
    const isPaginated = isCursorPaginationRequested(input)
    const limit = getCursorLimit(input.limit)
    const search = normalizeAdminSearch(input.search)
    const action = input.action ? normalizeAuditAction(input.action) : undefined
    const targetType = input.targetType
        ? normalizeAuditTarget(input.targetType, MAX_AUDIT_TARGET_TYPE_LENGTH, 'target type')
        : undefined
    const query = auditLogRepository
        .createQueryBuilder('audit')
        .leftJoinAndSelect('audit.actor', 'actor')

    if (search) {
        query.andWhere(`(
            audit.action ILIKE :auditSearch OR
            audit.targetType ILIKE :auditSearch OR
            audit.targetId ILIKE :auditSearch OR
            actor.name ILIKE :auditSearch OR
            audit.metadata::text ILIKE :auditSearch
        )`, { auditSearch: `%${search}%` })
    }

    if (action) {
        query.andWhere('audit.action = :action', { action })
    }

    if (targetType) {
        query.andWhere('audit.targetType = :targetType', {
            targetType,
        })
    }

    if (input.actorId) {
        query.andWhere('audit.actorId = :actorId', { actorId: input.actorId })
    }

    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        query.andWhere(
            '(audit.createdAt < :cursorCreatedAt OR (audit.createdAt = :cursorCreatedAt AND audit.id < :cursorId))',
            {
                cursorCreatedAt,
                cursorId: cursor.id,
            },
        )
    }

    const logs = await query
        .orderBy('audit.createdAt', 'DESC')
        .addOrderBy('audit.id', 'DESC')
        .take(isPaginated ? limit + 1 : 100)
        .getMany()

    return isPaginated
        ? toCursorPage(logs, limit, (log) => ({
            createdAt: log.createdAt.toISOString(),
            id: log.id,
        }))
        : logs
}

function assertAuditAdmin(admin: UserEntity) {
    if (isAdminRole(admin.role)) return

    throw new AppError({
        statusCode: 403,
        code: ERROR_CODES.Forbidden,
        message: 'Only admins can export or view audit logs.',
    })
}

export async function getAuditLogsForExport(
    admin: UserEntity,
    input: AuditLogsExportQuery,
) {
    assertAuditAdmin(admin)

    const query = AppDataSource.getRepository(AuditLogEntity)
        .createQueryBuilder('audit')
        .leftJoinAndSelect('audit.actor', 'actor')

    const search = normalizeAdminSearch(input.search)
    if (search) {
        query.andWhere(`(
            audit.action ILIKE :auditSearch OR
            audit.targetType ILIKE :auditSearch OR
            audit.targetId ILIKE :auditSearch OR
            actor.name ILIKE :auditSearch OR
            audit.metadata::text ILIKE :auditSearch
        )`, { auditSearch: `%${search}%` })
    }

    const action = input.action ? normalizeAuditAction(input.action) : undefined
    const targetType = input.targetType
        ? normalizeAuditTarget(input.targetType, MAX_AUDIT_TARGET_TYPE_LENGTH, 'target type')
        : undefined

    if (action) {
        query.andWhere('audit.action = :action', { action })
    }

    if (targetType) {
        query.andWhere('audit.targetType = :targetType', {
            targetType,
        })
    }

    if (input.actorId) {
        query.andWhere('audit.actorId = :actorId', { actorId: input.actorId })
    }

    return query
        .orderBy('audit.createdAt', 'DESC')
        .addOrderBy('audit.id', 'DESC')
        .take(getAuditExportRowLimit(input.limit))
        .getMany()
}

function toCsvCell(value: unknown) {
    const text = boundAuditCsvCell(typeof value === 'string' ? value : JSON.stringify(value ?? ''))
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safeText.replace(/"/g, '""')}"`
}

export function auditLogsToCsv(logs: AuditLogEntity[]) {
    const header = [
        'id',
        'actorId',
        'actorName',
        'action',
        'targetId',
        'targetType',
        'metadata',
        'ipAddress',
        'correlationId',
        'createdAt',
    ]

    const rows = logs.map((log) => [
        log.id,
        log.actorId,
        log.actor?.name ?? '',
        log.action,
        log.targetId ?? '',
        log.targetType ?? '',
        JSON.stringify(log.metadata ?? {}),
        log.ipAddress ?? '',
        log.correlationId ?? '',
        log.createdAt.toISOString(),
    ])

    return [
        header.map(toCsvCell).join(','),
        ...rows.map((row) => row.map(toCsvCell).join(',')),
    ].join('\n') + '\n'
}

export function getAuditLogExportHeaders(date: string) {
    return {
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-disposition': `attachment; filename="audit-logs-${date}.csv"`,
    } as const
}
