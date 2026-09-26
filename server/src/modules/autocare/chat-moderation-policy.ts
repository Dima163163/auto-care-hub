import { AutoCareChatReportCategory, AutoCareChatReportStatus, type AutoCareChatReportEntity } from '../../entities/automotive/chat-moderation.entity.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const categories = new Set<AutoCareChatReportCategory>([
    AutoCareChatReportCategory.Harassment,
    AutoCareChatReportCategory.Threat,
    AutoCareChatReportCategory.Fraud,
    AutoCareChatReportCategory.Other,
])
const reportStatuses = new Set<AutoCareChatReportStatus>(Object.values(AutoCareChatReportStatus))
const decisionStatuses = new Set<AutoCareChatReportStatus>([AutoCareChatReportStatus.Resolved, AutoCareChatReportStatus.Dismissed])
const reportInputKeys = new Set(['messageId', 'category', 'description', 'acknowledgeFullThreadReview'])

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
    const reportedMessageId = normalizeUuid(value.messageId)
    if (!reportedMessageId || value.acknowledgeFullThreadReview !== true) return null
    const description = normalizeNullableText(value.description, 2_000)
    if (description === undefined) return null
    return { reportedMessageId, category: category as AutoCareChatReportCategory, description }
}

export function normalizeAutoCareChatModeratorAssignment(moderatorId: unknown, reason: unknown) {
    const normalizedModeratorId = moderatorId === null ? null : normalizeUuid(moderatorId)
    if (moderatorId !== null && !normalizedModeratorId) return null
    const normalizedReason = normalizeNullableText(reason, 2_000)
    if (!normalizedReason || normalizedReason.length < 10) return null
    return { moderatorId: normalizedModeratorId, reason: normalizedReason }
}

export function normalizeAutoCareChatModeratorExtension(reason: unknown) {
    const normalizedReason = normalizeNullableText(reason, 2_000)
    if (!normalizedReason || normalizedReason.length < 10) return null
    return { reason: normalizedReason }
}

export function calculateAutoCareChatExtendedExpiry(currentExpiry: Date, now = new Date()) {
    if (currentExpiry.getTime() <= now.getTime()) return null
    return new Date(currentExpiry.getTime() + 24 * 60 * 60_000)
}

export function isAutoCareChatBlockEffective(expiresAt: Date | null | undefined, now = new Date()) {
    return expiresAt == null || expiresAt.getTime() > now.getTime()
}

export function resolveAutoCareChatReportConflict(input: {
    activeReports: Array<Pick<AutoCareChatReportEntity, 'id' | 'reporterId' | 'reportedUserId' | 'reportedMessageId' | 'createdAt'> & { reporterSide: 'client' | 'provider'; reportedSide: 'client' | 'provider' }>
    reporterSide: 'client' | 'provider'
    messageSenderSide: 'client' | 'provider'
    messageId: string
    messageCreatedAt: Date
    category: AutoCareChatReportCategory
    description: string | null
}) {
    const retaliatoryCases = input.activeReports.filter((report) =>
        report.reportedSide === input.reporterSide && input.messageCreatedAt.getTime() >= report.createdAt.getTime(),
    )
    if (!retaliatoryCases.length) return { blocked: false, relatedReportId: null as string | null }
    const linkedThreatCase = input.category === AutoCareChatReportCategory.Threat
        && Boolean(input.description && input.description.length >= 20)
        ? retaliatoryCases.find((report) => report.reporterSide === input.messageSenderSide && report.reportedMessageId !== input.messageId)
        : undefined
    if (linkedThreatCase) return { blocked: false, relatedReportId: linkedThreatCase.id }
    return { blocked: true, relatedReportId: null as string | null }
}

export function normalizeAutoCareChatBlockInput(blockedUserId: unknown, reason: unknown) {
    const normalizedBlockedUserId = blockedUserId === undefined ? null : normalizeUuid(blockedUserId)
    if (blockedUserId !== undefined && !normalizedBlockedUserId) return null
    const normalizedReason = normalizeNullableText(reason, 1_000)
    if (normalizedReason === undefined) return null
    return { blockedUserId: normalizedBlockedUserId, reason: normalizedReason }
}

export function normalizeAutoCareChatReportDecision(status: unknown, reason: unknown, blockUser: unknown, blockDurationDays?: unknown) {
    const normalizedStatus = typeof status === 'string' ? status.normalize('NFKC').trim().toLowerCase() : null
    if (!normalizedStatus || !decisionStatuses.has(normalizedStatus as AutoCareChatReportStatus)) return null
    if (blockUser !== undefined && typeof blockUser !== 'boolean') return null
    const normalizedReason = normalizeNullableText(reason, 2_000)
    if (!normalizedReason || normalizedReason.length < 10) return null
    if (blockUser === true && normalizedStatus !== AutoCareChatReportStatus.Resolved) return null
    if (blockDurationDays !== undefined && (!Number.isInteger(blockDurationDays) || ![1, 7, 30].includes(blockDurationDays as number))) return null
    if (blockDurationDays !== undefined && blockUser !== true) return null
    return {
        status: normalizedStatus as AutoCareChatReportStatus.Resolved | AutoCareChatReportStatus.Dismissed,
        reason: normalizedReason,
        blockUser: blockUser ?? false,
        blockDurationDays: blockUser === true ? (blockDurationDays as number | undefined ?? 1) : null,
    }
}
