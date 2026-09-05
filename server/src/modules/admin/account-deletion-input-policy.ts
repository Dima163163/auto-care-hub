import { AccountDeletionRequestStatus } from '../../entities/account-deletion-request/account-deletion-request.entity.js'

const QUERY_KEYS = new Set(['status', 'cursor', 'limit'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_CURSOR_LENGTH = 512
const MAX_PAGE_LIMIT = 100
const STATUSES = new Set<string>(Object.values(AccountDeletionRequestStatus))
const TERMINAL_STATUSES = new Set<string>([
    AccountDeletionRequestStatus.Cancelled,
    AccountDeletionRequestStatus.Completed,
])

type RecordInput = Record<string, unknown>

function asRecord(value: unknown): RecordInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as RecordInput
}

function normalizeStatus(value: unknown, values: Set<string>) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return values.has(normalized) ? normalized as AccountDeletionRequestStatus : null
}

export function normalizeAccountDeletionRequestUuid(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return UUID_PATTERN.test(normalized) ? normalized : null
}

export function normalizeAccountDeletionRequestStatus(value: unknown) {
    return normalizeStatus(value, STATUSES)
}

export function normalizeAccountDeletionTerminalStatus(value: unknown) {
    return normalizeStatus(value, TERMINAL_STATUSES)
}

export type NormalizedAccountDeletionRequestsQuery = {
    status?: AccountDeletionRequestStatus
    cursor?: string
    limit?: number
}

export function normalizeAccountDeletionRequestsQuery(value: unknown): NormalizedAccountDeletionRequestsQuery | null {
    const input = asRecord(value === undefined ? {} : value)
    if (!input || Object.keys(input).some((key) => !QUERY_KEYS.has(key))) return null

    const status = input.status === undefined ? undefined : normalizeAccountDeletionRequestStatus(input.status)
    const cursor = input.cursor === undefined
        ? undefined
        : typeof input.cursor === 'string'
            ? input.cursor.normalize('NFKC').trim()
            : null
    const limit = input.limit === undefined ? undefined : input.limit

    if (
        (input.status !== undefined && !status)
        || cursor === null
        || (cursor !== undefined && cursor.length > MAX_CURSOR_LENGTH)
        || (limit !== undefined && (
            typeof limit !== 'number'
            || !Number.isSafeInteger(limit)
            || limit < 1
            || limit > MAX_PAGE_LIMIT
        ))
    ) return null

    return {
        ...(status ? { status } : {}),
        ...(cursor ? { cursor } : {}),
        ...(limit === undefined ? {} : { limit }),
    }
}
