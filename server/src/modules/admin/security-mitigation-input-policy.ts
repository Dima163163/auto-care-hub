import { SecurityMitigationKind } from '../../entities/security-mitigation/security-mitigation.entity.js'
import { stripControlCharacters } from '../../shared/security/string-normalization.js'
import { normalizeIpAddress } from '../../shared/security/trusted-proxy.js'

const QUERY_KEYS = new Set(['cursor', 'limit', 'status', 'ipAddress', 'kind'])
const CREATE_KEYS = new Set(['kind', 'ipAddress', 'reason', 'ttlMinutes'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_CURSOR_LENGTH = 512
const MAX_IP_DISPLAY_LENGTH = 64
const MAX_REASON_LENGTH = 500
const MIN_TTL_MINUTES = 1
const MAX_TTL_MINUTES = 1_440

type RecordInput = Record<string, unknown>

function asRecord(value: unknown): RecordInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as RecordInput
}

function hasOnlyKeys(value: RecordInput, allowed: Set<string>) {
    return Object.keys(value).every((key) => allowed.has(key))
}

function normalizeEnum(value: unknown) {
    return typeof value === 'string' ? value.normalize('NFKC').trim().toLowerCase() : value
}

export function normalizeSecurityMitigationUuid(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return UUID_PATTERN.test(normalized) ? normalized : null
}

export function normalizeSecurityMitigationIpInput(value: unknown) {
    if (typeof value !== 'string') return null
    const displayValue = stripControlCharacters(value).normalize('NFKC').trim()
    const normalizedValue = normalizeIpAddress(displayValue)
    if (!normalizedValue || displayValue.length > MAX_IP_DISPLAY_LENGTH) return null
    return { displayValue, normalizedValue }
}

export function normalizeSecurityMitigationReasonInput(value: unknown) {
    if (typeof value !== 'string') return null
    const reason = stripControlCharacters(value).normalize('NFKC').replace(/[\t\n\r\f\v]/g, ' ').trim()
    if (!reason || reason.length > MAX_REASON_LENGTH) return null
    return reason
}

export type NormalizedSecurityMitigationCreateInput = {
    kind: SecurityMitigationKind
    ipAddress: { displayValue: string; normalizedValue: string }
    reason: string
    ttlMinutes: number
}

export function normalizeSecurityMitigationCreateInput(value: unknown): NormalizedSecurityMitigationCreateInput | null {
    const input = asRecord(value)
    if (!input || !hasOnlyKeys(input, CREATE_KEYS)) return null

    const kind = normalizeEnum(input.kind ?? SecurityMitigationKind.IpBlock)
    if (kind !== SecurityMitigationKind.IpBlock) return null

    const ipAddress = normalizeSecurityMitigationIpInput(input.ipAddress)
    const reason = normalizeSecurityMitigationReasonInput(input.reason)
    const ttlMinutes = input.ttlMinutes === undefined ? 60 : input.ttlMinutes
    if (
        !ipAddress
        || !reason
        || typeof ttlMinutes !== 'number'
        || !Number.isSafeInteger(ttlMinutes)
        || ttlMinutes < MIN_TTL_MINUTES
        || ttlMinutes > MAX_TTL_MINUTES
    ) return null

    return {
        kind: SecurityMitigationKind.IpBlock,
        ipAddress,
        reason,
        ttlMinutes,
    }
}

export function normalizeSecurityMitigationExtensionMinutes(value: unknown) {
    if (
        typeof value !== 'number'
        || !Number.isSafeInteger(value)
        || value < MIN_TTL_MINUTES
        || value > MAX_TTL_MINUTES
    ) return null
    return value
}

export type NormalizedSecurityMitigationsQuery = {
    cursor?: string
    limit?: number
    status: 'active' | 'expired' | 'revoked'
    ipAddress?: string
    kind: SecurityMitigationKind
}

export function normalizeSecurityMitigationsQuery(value: unknown): NormalizedSecurityMitigationsQuery | null {
    const input = asRecord(value === undefined ? {} : value)
    if (!input || !hasOnlyKeys(input, QUERY_KEYS)) return null

    const status = normalizeEnum(input.status ?? 'active')
    const kind = normalizeEnum(input.kind ?? SecurityMitigationKind.IpBlock)
    if (
        (status !== 'active' && status !== 'expired' && status !== 'revoked')
        || kind !== SecurityMitigationKind.IpBlock
    ) return null

    const ipAddress = input.ipAddress === undefined ? undefined : normalizeSecurityMitigationIpInput(input.ipAddress)
    const cursor = input.cursor === undefined
        ? undefined
        : typeof input.cursor === 'string'
            ? input.cursor.normalize('NFKC').trim()
            : null
    const limit = input.limit === undefined ? undefined : input.limit
    if (
        (input.ipAddress !== undefined && !ipAddress)
        || cursor === null
        || (cursor !== undefined && cursor.length > MAX_CURSOR_LENGTH)
        || (limit !== undefined && (
            typeof limit !== 'number'
            || !Number.isSafeInteger(limit)
            || limit < MIN_TTL_MINUTES
            || limit > 100
        ))
    ) return null

    return {
        ...(cursor ? { cursor } : {}),
        ...(limit === undefined ? {} : { limit }),
        status,
        ...(ipAddress ? { ipAddress: ipAddress.displayValue } : {}),
        kind: SecurityMitigationKind.IpBlock,
    }
}
