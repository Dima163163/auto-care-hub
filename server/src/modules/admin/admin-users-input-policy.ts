import { UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { normalizeAdminSearch } from './admin-query-policy.js'

const QUERY_KEYS = new Set(['cursor', 'limit', 'search', 'role', 'status'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_CURSOR_LENGTH = 512
const MAX_PAGE_LIMIT = 100
const ROLES = new Set<string>(Object.values(UserRole))
const STATUSES = new Set<string>(Object.values(UserStatus))

type RecordInput = Record<string, unknown>

function asRecord(value: unknown): RecordInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as RecordInput
}

function normalizeEnum(value: unknown, values: Set<string>) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return values.has(normalized) ? normalized : null
}

export function normalizeAdminUserUuid(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return UUID_PATTERN.test(normalized) ? normalized : null
}

export function normalizeAdminUserStatus(value: unknown) {
    return normalizeEnum(value, STATUSES) as UserStatus | null
}

export function normalizeAdminUserRole(value: unknown) {
    return normalizeEnum(value, ROLES) as UserRole | null
}

export type NormalizedAdminUsersQuery = {
    cursor?: string
    limit?: number
    search?: string
    role?: UserRole
    status?: UserStatus
}

export function normalizeAdminUsersQuery(value: unknown): NormalizedAdminUsersQuery | null {
    const input = asRecord(value === undefined ? {} : value)
    if (!input || Object.keys(input).some((key) => !QUERY_KEYS.has(key))) return null

    const cursor = input.cursor === undefined
        ? undefined
        : typeof input.cursor === 'string'
            ? input.cursor.normalize('NFKC').trim()
            : null
    const limit = input.limit === undefined ? undefined : input.limit
    let search: string | undefined | null
    if (input.search === undefined) {
        search = undefined
    } else if (typeof input.search !== 'string') {
        search = null
    } else {
        try {
            search = normalizeAdminSearch(input.search.normalize('NFKC'))
        } catch {
            search = null
        }
    }
    const role = input.role === undefined ? undefined : normalizeAdminUserRole(input.role)
    const status = input.status === undefined ? undefined : normalizeAdminUserStatus(input.status)

    if (
        cursor === null
        || (cursor !== undefined && cursor.length > MAX_CURSOR_LENGTH)
        || (limit !== undefined && (
            typeof limit !== 'number'
            || !Number.isSafeInteger(limit)
            || limit < 1
            || limit > MAX_PAGE_LIMIT
        ))
        || search === null
        || (input.role !== undefined && !role)
        || (input.status !== undefined && !status)
    ) return null

    return {
        ...(cursor ? { cursor } : {}),
        ...(limit === undefined ? {} : { limit }),
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
    }
}
