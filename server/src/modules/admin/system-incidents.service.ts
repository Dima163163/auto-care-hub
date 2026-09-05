import { AppDataSource } from '../../database/data-source.js'
import {
    SystemIncidentEntity,
    SystemIncidentSeverity,
    SystemIncidentStatus,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import { logError } from '../../shared/observability/logger.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import type { SystemIncidentsQuery } from './admin.schemas.js'
import {
    MAX_INCIDENT_METADATA_BYTES,
    isWithinUtf8ByteLimit,
} from '../../shared/security/request-limits.js'
import { normalizeAdminSearch } from './admin-query-policy.js'
import {
    MAX_REQUEST_CORRELATION_ID_LENGTH,
    normalizeRequestHeader,
} from '../../shared/http/request-header-policy.js'
import { assertIncidentMetadataKeyCount } from './incident-metadata-policy.js'
import { assertSystemIncidentStatusTransition } from './system-incident-status-policy.js'
import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'
import { sanitizeLogMetadata } from '../../shared/observability/sensitive-data.js'
import { normalizeSystemIncidentRecordInput, normalizeSystemIncidentStatus, normalizeSystemIncidentUuid } from './system-incident-input-policy.js'

const INCIDENT_DEDUPLICATION_WINDOW_MS = 15 * 60 * 1000

type RecordSystemIncidentInput = {
    type: SystemIncidentType
    severity: SystemIncidentSeverity
    title: string
    requestId?: string
    metadata?: Record<string, unknown>
}

export function normalizeIncidentTitle(title: string) {
    const normalized = normalizeTextWhitespace(title).trim().replace(/\s+/g, ' ')
    if (!normalized || normalized.length > 240) {
        throw new Error('System incident title is invalid.')
    }
    return normalized
}

export function assertIncidentMetadataWithinBounds(metadata: Record<string, unknown>) {
    assertIncidentMetadataKeyCount(metadata)
    const serialized = JSON.stringify(metadata)
    if (serialized === undefined || !isWithinUtf8ByteLimit(serialized, MAX_INCIDENT_METADATA_BYTES)) {
        throw new Error('System incident metadata is too large.')
    }
    return metadata
}

function getIncidentDeduplicationKey(input: Pick<RecordSystemIncidentInput, 'type' | 'title'>) {
    return `${input.type}:${normalizeIncidentTitle(input.title)}`
}

function assertSuperAdmin(user: UserEntity) {
    if (!isSuperAdmin(user)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admin can access system incidents.',
        })
    }
}

function requireSystemIncidentUuid(value: unknown) {
    const normalized = normalizeSystemIncidentUuid(value)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'System incident id must be a valid UUID.' })
    }
    return normalized
}

function requireSystemIncidentStatus(value: unknown) {
    const normalized = normalizeSystemIncidentStatus(value)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'System incident status is invalid.' })
    }
    return normalized
}

export async function recordSystemIncidentSafely(input: RecordSystemIncidentInput) {
    const normalizedInput = normalizeSystemIncidentRecordInput(input)
    if (!normalizedInput) return null
    try {
        return await AppDataSource.transaction(async (manager) => {
            const repository = manager.getRepository(SystemIncidentEntity)
            const now = new Date()
            const title = normalizeIncidentTitle(normalizedInput.title)
            const metadata = sanitizeLogMetadata(
                assertIncidentMetadataWithinBounds(normalizedInput.metadata ?? {}),
            )
            const requestId = normalizeRequestHeader(normalizedInput.requestId, MAX_REQUEST_CORRELATION_ID_LENGTH)
            const deduplicationThreshold = new Date(
                now.getTime() - INCIDENT_DEDUPLICATION_WINDOW_MS,
            )

            await manager.query(
                'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
                [getIncidentDeduplicationKey(normalizedInput)],
            )

            const existingIncident = await repository
                .createQueryBuilder('incident')
                .where('incident.type = :type', { type: normalizedInput.type })
                .andWhere('incident.title = :title', { title })
                .andWhere('incident.status != :resolvedStatus', {
                    resolvedStatus: SystemIncidentStatus.Resolved,
                })
                .andWhere('incident.lastOccurredAt >= :deduplicationThreshold', {
                    deduplicationThreshold,
                })
                .orderBy('incident.lastOccurredAt', 'DESC')
                .getOne()

            if (existingIncident) {
                existingIncident.lastOccurredAt = now
                existingIncident.occurrenceCount += 1
                existingIncident.requestId = requestId ?? existingIncident.requestId
                existingIncident.metadata = {
                    ...existingIncident.metadata,
                    ...metadata,
                }

                return repository.save(existingIncident)
            }

            return repository.save(repository.create({
                ...normalizedInput,
                title,
                requestId,
                metadata,
                occurrenceCount: 1,
                firstOccurredAt: now,
                lastOccurredAt: now,
                acknowledgedAt: null,
                resolvedAt: null,
                status: SystemIncidentStatus.Open,
            }))
        })
    } catch (error) {
        logError('Failed to record system incident', error, {
            incidentType: input.type,
        })
        return null
    }
}

export async function getSystemIncidents(
    user: UserEntity,
    input: SystemIncidentsQuery = {},
): Promise<SystemIncidentEntity[] | CursorPage<SystemIncidentEntity>> {
    assertSuperAdmin(user)

    const isPaginated = isCursorPaginationRequested(input)
    const limit = getCursorLimit(input.limit)
    const search = normalizeAdminSearch(input.search)
    const query = AppDataSource.getRepository(SystemIncidentEntity)
        .createQueryBuilder('incident')

    if (search) {
        query.andWhere('incident.title ILIKE :search', {
            search: `%${search}%`,
        })
    }

    if (input.type) {
        query.andWhere('incident.type = :type', { type: input.type })
    }

    if (input.severity) {
        query.andWhere('incident.severity = :severity', {
            severity: input.severity,
        })
    }

    if (input.status) {
        query.andWhere('incident.status = :status', { status: input.status })
    }

    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['lastOccurredAt', 'id'])
        const cursorLastOccurredAt = assertCursorDate(cursor, 'lastOccurredAt')
        query.andWhere(
            '(incident.lastOccurredAt < :cursorLastOccurredAt OR (incident.lastOccurredAt = :cursorLastOccurredAt AND incident.id < :cursorId))',
            {
                cursorLastOccurredAt,
                cursorId: cursor.id,
            },
        )
    }

    const incidents = await query
        .orderBy('incident.lastOccurredAt', 'DESC')
        .addOrderBy('incident.id', 'DESC')
        .take(isPaginated ? limit + 1 : 100)
        .getMany()

    return isPaginated
        ? toCursorPage(incidents, limit, (incident) => ({
            lastOccurredAt: incident.lastOccurredAt.toISOString(),
            id: incident.id,
        }))
        : incidents
}

export async function updateSystemIncidentStatus(
    user: UserEntity,
    incidentId: unknown,
    status: unknown,
) {
    assertSuperAdmin(user)
    const normalizedIncidentId = requireSystemIncidentUuid(incidentId)
    const normalizedStatus = requireSystemIncidentStatus(status)

    const repository = AppDataSource.getRepository(SystemIncidentEntity)
    const incident = await repository.findOne({
        where: { id: normalizedIncidentId },
    })

    if (!incident) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'System incident not found.',
        })
    }

    incident.status = assertSystemIncidentStatusTransition(incident.status, normalizedStatus)
    incident.acknowledgedAt = normalizedStatus === SystemIncidentStatus.Acknowledged
        ? new Date()
        : incident.acknowledgedAt
    incident.resolvedAt = normalizedStatus === SystemIncidentStatus.Resolved
        ? new Date()
        : null

    return repository.save(incident)
}
