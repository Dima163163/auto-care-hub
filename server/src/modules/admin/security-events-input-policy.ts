import { SecurityEventType } from '../../entities/security-event/security-event.entity.js'

const QUERY_KEYS = new Set(['cursor', 'limit', 'type', 'userId'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_CURSOR_LENGTH = 512
const MAX_PAGE_LIMIT = 100
const EVENT_TYPES = new Set<string>(Object.values(SecurityEventType))

type RecordInput = Record<string, unknown>

function asRecord(value: unknown): RecordInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as RecordInput
}

function normalizeEnum(value: unknown) {
    return typeof value === 'string' ? value.normalize('NFKC').trim().toLowerCase() : value
}

export function normalizeSecurityEventUuid(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return UUID_PATTERN.test(normalized) ? normalized : null
}

export type NormalizedSecurityEventsQuery = {
    cursor?: string
    limit?: number
    type?: SecurityEventType
    userId?: string
}

export function normalizeSecurityEventsQuery(value: unknown): NormalizedSecurityEventsQuery | null {
    const input = asRecord(value === undefined ? {} : value)
    if (!input || Object.keys(input).some((key) => !QUERY_KEYS.has(key))) return null

    const cursor = input.cursor === undefined
        ? undefined
        : typeof input.cursor === 'string'
            ? input.cursor.normalize('NFKC').trim()
            : null
    const limit = input.limit === undefined ? undefined : input.limit
    const type = input.type === undefined ? undefined : normalizeEnum(input.type)
    const userId = input.userId === undefined ? undefined : normalizeSecurityEventUuid(input.userId)

    if (
        cursor === null
        || (cursor !== undefined && cursor.length > MAX_CURSOR_LENGTH)
        || (limit !== undefined && (
            typeof limit !== 'number'
            || !Number.isSafeInteger(limit)
            || limit < 1
            || limit > MAX_PAGE_LIMIT
        ))
        || (type !== undefined && (typeof type !== 'string' || !EVENT_TYPES.has(type)))
        || (input.userId !== undefined && !userId)
    ) return null

    return {
        ...(cursor ? { cursor } : {}),
        ...(limit === undefined ? {} : { limit }),
        ...(type === undefined ? {} : { type: type as SecurityEventType }),
        ...(userId ? { userId } : {}),
    }
}
