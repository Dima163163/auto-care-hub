import { AutoCareChatBlockEntity, AutoCareChatBlockStatus, AutoCareChatReportCategory, AutoCareChatReportEntity, AutoCareChatReportStatus } from '../../entities/index.js'

export type CreateAutoCareChatReportInput = {
    messageId: string
    category: AutoCareChatReportCategory
    description?: string | null
    acknowledgeFullThreadReview: true
}

export type AutoCareChatReportResponse = {
    id: string
    threadId: string
    messageId: string | null
    relatedReportId: string | null
    reporterId: string
    reportedUserId: string | null
    category: AutoCareChatReportCategory
    description: string | null
    status: AutoCareChatReportStatus
    reviewedById: string | null
    resolutionReason: string | null
    overturnedAt: string | null
    assignedModeratorId: string | null
    accessExpiresAt: string | null
    extensionUsed: boolean
    createdAt: string
    reviewedAt: string | null
    acknowledgedAt: string | null
    policyVersion: string | null
}

export type AutoCareChatBlockResponse = {
    id: string
    threadId: string
    blockerId: string
    blockedUserId: string
    status: AutoCareChatBlockStatus
    reason: string | null
    sourceReportId: string | null
    expiresAt: string | null
    createdAt: string
    revokedAt: string | null
}

export function reportResponse(report: AutoCareChatReportEntity, includePrivateDetails = false): AutoCareChatReportResponse {
    return {
        id: report.id,
        threadId: report.threadId,
        messageId: report.reportedMessageId,
        relatedReportId: report.relatedReportId,
        reporterId: report.reporterId,
        reportedUserId: report.reportedUserId,
        category: report.category,
        description: includePrivateDetails ? report.description : null,
        status: report.status,
        reviewedById: report.reviewedById,
        resolutionReason: includePrivateDetails ? report.resolutionReason : null,
        overturnedAt: report.overturnedAt?.toISOString() ?? null,
        assignedModeratorId: report.assignedModeratorId,
        accessExpiresAt: report.accessExpiresAt?.toISOString() ?? null,
        extensionUsed: report.extensionUsed,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
        acknowledgedAt: report.acknowledgedAt?.toISOString() ?? null,
        policyVersion: report.policyVersion,
    }
}

export function blockResponse(block: AutoCareChatBlockEntity): AutoCareChatBlockResponse {
    return {
        id: block.id,
        threadId: block.threadId,
        blockerId: block.blockerId,
        blockedUserId: block.blockedUserId,
        status: block.status,
        reason: block.reason,
        sourceReportId: block.sourceReportId,
        expiresAt: block.expiresAt?.toISOString() ?? null,
        createdAt: block.createdAt.toISOString(),
        revokedAt: block.revokedAt?.toISOString() ?? null,
    }
}
