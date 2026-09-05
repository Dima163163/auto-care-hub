import { SecurityEventActionStatus } from '../../entities/security-event/security-event-action.entity.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const statuses = new Set<SecurityEventActionStatus>(Object.values(SecurityEventActionStatus))

export function normalizeSecurityCenterUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeSecurityCenterStatus(value: unknown): SecurityEventActionStatus | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return statuses.has(normalized as SecurityEventActionStatus)
        ? normalized as SecurityEventActionStatus
        : null
}

export function normalizeSecurityCenterOperatorNoteInput(value: unknown): string | null | undefined {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    return normalized.length <= 1_000 ? normalized || null : undefined
}

export function normalizeSecurityCenterStatusMutation(input: {
    status: unknown
    operatorNote?: unknown
    assigneeId?: unknown
}) {
    const status = normalizeSecurityCenterStatus(input.status)
    if (!status) return null
    const operatorNote = normalizeSecurityCenterOperatorNoteInput(input.operatorNote)
    if (operatorNote === undefined && input.operatorNote !== undefined) return null

    let assigneeId: string | null | undefined
    if (input.assigneeId === undefined) {
        assigneeId = undefined
    } else if (input.assigneeId === null) {
        assigneeId = null
    } else {
        assigneeId = normalizeSecurityCenterUuid(input.assigneeId)
        if (!assigneeId) return null
    }

    return { status, operatorNote: operatorNote ?? null, assigneeId }
}
