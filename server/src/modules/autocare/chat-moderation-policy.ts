import { AutoCareChatReportCategory, AutoCareChatReportStatus } from '../../entities/automotive/chat-moderation.entity.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const categories = new Set<AutoCareChatReportCategory>(Object.values(AutoCareChatReportCategory))
const reportStatuses = new Set<AutoCareChatReportStatus>(Object.values(AutoCareChatReportStatus))
const decisionStatuses = new Set<AutoCareChatReportStatus>([AutoCareChatReportStatus.Resolved, AutoCareChatReportStatus.Dismissed])
const reportInputKeys = new Set(['category', 'description'])

function normalizeUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeAutoCareChatReportUuid(value: unknown): string | null {
    return normalizeUuid(value)
}

export function normalizeAutoCareChatReportStatus(value: unknown): AutoCareChatReportStatus | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return reportStatuses.has(normalized as AutoCareChatReportStatus)
        ? normalized as AutoCareChatReportStatus
        : null
}

function normalizeNullableText(value: unknown, maxLength: number): string | null | undefined {
    if (value === undefined) return null
    if (value === null) return null
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    return normalized.length <= maxLength ? normalized || null : undefined
}

export function normalizeAutoCareChatReportInput(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !reportInputKeys.has(key))) return null
    const category = typeof value.category === 'string' ? value.category.normalize('NFKC').trim().toLowerCase() : null
    if (!category || !categories.has(category as AutoCareChatReportCategory)) return null
    const description = normalizeNullableText(value.description, 2_000)
    if (description === undefined) return null
    return { category: category as AutoCareChatReportCategory, description }
}

export function normalizeAutoCareChatBlockInput(blockedUserId: unknown, reason: unknown) {
    const normalizedBlockedUserId = blockedUserId === undefined ? null : normalizeUuid(blockedUserId)
    if (blockedUserId !== undefined && !normalizedBlockedUserId) return null
    const normalizedReason = normalizeNullableText(reason, 1_000)
    if (normalizedReason === undefined) return null
    return { blockedUserId: normalizedBlockedUserId, reason: normalizedReason }
}

export function normalizeAutoCareChatReportDecision(status: unknown, reason: unknown, blockUser: unknown) {
    const normalizedStatus = typeof status === 'string' ? status.normalize('NFKC').trim().toLowerCase() : null
    if (!normalizedStatus || !decisionStatuses.has(normalizedStatus as AutoCareChatReportStatus)) return null
    if (blockUser !== undefined && typeof blockUser !== 'boolean') return null
    const normalizedReason = normalizeNullableText(reason, 2_000)
    if (normalizedReason === undefined) return null
    return {
        status: normalizedStatus as AutoCareChatReportStatus.Resolved | AutoCareChatReportStatus.Dismissed,
        reason: normalizedReason,
        blockUser: blockUser ?? false,
    }
}
