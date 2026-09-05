import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import { normalizeAdminSearch } from './admin-query-policy.js'
import { normalizeAuditAction } from './audit-log-guards.js'
import {
    MAX_AUDIT_TARGET_TYPE_LENGTH,
    normalizeAuditTarget,
} from './audit-target-policy.js'

const QUERY_KEYS = new Set(['cursor', 'limit', 'search', 'action', 'targetType', 'actorId'])
const EXPORT_KEYS = new Set(['search', 'action', 'targetType', 'actorId', 'limit'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_CURSOR_LENGTH = 512
const MAX_LIST_LIMIT = 100
const MAX_EXPORT_LIMIT = 10_000

type RecordInput = Record<string, unknown>

function asRecord(value: unknown): RecordInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as RecordInput
}

function normalizeOptionalString(value: unknown) {
    if (value === undefined) return undefined
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized || undefined
}

function normalizeSearch(value: unknown) {
    const normalized = normalizeOptionalString(value)
    if (normalized === null || normalized === undefined) return normalized
    try {
        return normalizeAdminSearch(normalized)
    } catch {
        return null
    }
}

function normalizeAction(value: unknown) {
    const normalized = normalizeOptionalString(value)
    if (normalized === null || normalized === undefined) return normalized
    try {
        return normalizeAuditAction(normalized.toLowerCase())
    } catch {
        return null
    }
}

function normalizeTargetType(value: unknown) {
    const normalized = normalizeOptionalString(value)
    if (normalized === null || normalized === undefined) return normalized
    try {
        return normalizeAuditTarget(normalized, MAX_AUDIT_TARGET_TYPE_LENGTH, 'target type')
    } catch {
        return null
    }
}

function normalizeActorId(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return UUID_PATTERN.test(normalized) ? normalized : null
}

function normalizeCommonQuery(input: RecordInput, maxLimit: number) {
    const cursor = input.cursor === undefined
        ? undefined
        : typeof input.cursor === 'string'
            ? input.cursor.normalize('NFKC').trim()
            : null
    const limit = input.limit === undefined ? undefined : input.limit
    const search = normalizeSearch(input.search)
    const action = normalizeAction(input.action)
    const targetType = normalizeTargetType(input.targetType)
    const actorId = input.actorId === undefined ? undefined : normalizeActorId(input.actorId)

    if (
        cursor === null
        || (cursor !== undefined && cursor.length > MAX_CURSOR_LENGTH)
        || (limit !== undefined && (
            typeof limit !== 'number'
            || !Number.isSafeInteger(limit)
            || limit < 1
            || limit > maxLimit
        ))
        || search === null
        || action === null
        || targetType === null
        || (input.actorId !== undefined && !actorId)
    ) return null

    return {
        ...(cursor ? { cursor } : {}),
        ...(limit === undefined ? {} : { limit }),
        ...(search ? { search } : {}),
        ...(action ? { action } : {}),
        ...(targetType ? { targetType } : {}),
        ...(actorId ? { actorId } : {}),
    }
}

export type NormalizedAdminAuditLogsQuery = ReturnType<typeof normalizeCommonQuery> & {
    action?: AuditAction | string
}

export function normalizeAdminAuditLogsQuery(value: unknown): NormalizedAdminAuditLogsQuery | null {
    const input = asRecord(value === undefined ? {} : value)
    if (!input || Object.keys(input).some((key) => !QUERY_KEYS.has(key))) return null
    return normalizeCommonQuery(input, MAX_LIST_LIMIT) as NormalizedAdminAuditLogsQuery | null
}

export type NormalizedAuditLogsExportQuery = {
    search?: string
    action?: AuditAction | string
    targetType?: string
    actorId?: string
    limit: number
}

export function normalizeAuditLogsExportQuery(value: unknown): NormalizedAuditLogsExportQuery | null {
    const input = asRecord(value === undefined ? { limit: 1_000 } : value)
    if (!input || Object.keys(input).some((key) => !EXPORT_KEYS.has(key))) return null

    const normalized = normalizeCommonQuery(input, MAX_EXPORT_LIMIT)
    if (!normalized) return null

    return {
        ...(normalized.search ? { search: normalized.search } : {}),
        ...(normalized.action ? { action: normalized.action } : {}),
        ...(normalized.targetType ? { targetType: normalized.targetType } : {}),
        ...(normalized.actorId ? { actorId: normalized.actorId } : {}),
        limit: normalized.limit ?? 1_000,
    }
}
