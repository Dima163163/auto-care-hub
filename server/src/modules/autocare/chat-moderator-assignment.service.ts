import type { FastifyRequest } from 'fastify'
import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatThreadEntity, AutoCareChatThreadType, AutoCareChatReportEntity, AutoCareChatReportStatus, ServiceMessageEntity, ServiceMessageKind } from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { calculateAutoCareChatExtendedExpiry, normalizeAutoCareChatModeratorAssignment, normalizeAutoCareChatModeratorExtension, normalizeAutoCareChatReportUuid } from './chat-moderation-policy.js'
import { recordAuditLog } from '../admin/audit-log.service.js'
import { enqueueNotification } from '../outbox/notification-outbox.service.js'
import { lockThreadForMutation } from './chat-access.service.js'
import { assertRole, fail } from './chat-errors.js'
import { reportResponse } from './chat-moderation-response.js'

export async function assignAdminAutoCareChatModerator(user: UserEntity, reportId: string, moderatorId: string | null, reason: string, request?: FastifyRequest) {
    assertRole(user, [UserRole.SuperAdmin], 'Only a super administrator can assign chat moderators.')
    const normalizedReportId = normalizeAutoCareChatReportUuid(reportId)
    const normalizedInput = normalizeAutoCareChatModeratorAssignment(moderatorId, reason)
    if (!normalizedReportId || !normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Moderator assignment is invalid.' })
    const report = await AppDataSource.getRepository(AutoCareChatReportEntity).findOneBy({ id: normalizedReportId })
    if (!report) fail(404, 'Chat report not found.')
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: report.threadId })
    if (!thread) fail(404, 'Chat not found.')
    const assigned = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        const reports = manager.getRepository(AutoCareChatReportEntity)
        const lockedReport = await reports.findOne({ where: { id: normalizedReportId }, lock: { mode: 'pessimistic_write' } })
        if (!lockedReport) fail(404, 'Chat report not found.')
        if (lockedReport.status !== AutoCareChatReportStatus.Pending) fail(409, 'Only pending reports can be assigned.')
        if (lockedThread.type !== AutoCareChatThreadType.ServiceRequest || !lockedThread.requestId) fail(409, 'Moderation assignment is limited to service-request threads.')
        if (!lockedReport.reportedMessageId || !lockedReport.acknowledgedAt || !lockedReport.policyVersion) fail(409, 'This legacy report has no message-level consent and cannot grant chat access.')
        if (normalizedInput.moderatorId) {
            const moderator = await manager.getRepository(UserEntity).findOneBy({ id: normalizedInput.moderatorId })
            if (!moderator || moderator.role !== UserRole.Admin || moderator.status !== UserStatus.Active) fail(400, 'The moderator must be an active administrator.')
        }
        const now = new Date()
        if (normalizedInput.moderatorId
            && lockedReport.assignedModeratorId === normalizedInput.moderatorId
            && lockedReport.assignmentReason === normalizedInput.reason
            && lockedReport.accessExpiresAt
            && lockedReport.accessExpiresAt.getTime() > now.getTime()) {
            return lockedReport
        }
        const anchor = await manager.getRepository(ServiceMessageEntity).findOne({
            where: { id: lockedReport.reportedMessageId, requestId: lockedThread.requestId },
            select: { id: true, threadId: true, requestId: true, kind: true, deletedAt: true },
        })
        if (!anchor || anchor.threadId !== lockedThread.id || anchor.kind !== ServiceMessageKind.Text || anchor.deletedAt) fail(409, 'This report does not reference an eligible message in the service-request thread.')
        const pending = await reports.find({ where: { threadId: lockedThread.id, status: AutoCareChatReportStatus.Pending } })
        const assignable = pending.filter((item) => item.reportedMessageId && item.acknowledgedAt && item.policyVersion)
        const accessExpiresAt = normalizedInput.moderatorId ? new Date(now.getTime() + 24 * 60 * 60_000) : null
        const extensionAlreadyUsed = assignable.some((item) => item.extensionUsed)
        const updated = assignable.map((item) => ({
            ...item,
            assignedModeratorId: normalizedInput.moderatorId,
            assignedById: user.id,
            assignmentReason: normalizedInput.reason,
            assignedAt: normalizedInput.moderatorId ? now : null,
            accessExpiresAt,
            extensionUsed: extensionAlreadyUsed || item.extensionUsed,
            extensionReason: item.extensionReason,
            extendedAt: item.extendedAt,
        }))
        const saved = await reports.save(updated)
        const result = saved.find((item) => item.id === lockedReport.id) ?? lockedReport
        if (normalizedInput.moderatorId) {
            for (const assignedReport of saved) {
                await enqueueNotification({
                    userId: normalizedInput.moderatorId,
                    category: NotificationCategory.Moderation,
                    template: { key: 'autocare.chat_report_assigned' },
                    link: '/admin/dashboard',
                    metadata: { reportId: assignedReport.id },
                }, `autocare-chat-report:${assignedReport.id}:assigned:${now.getTime()}`, manager)
            }
        }
        await recordAuditLog({
            manager,
            actorId: user.id,
            action: AuditAction.ChatReportModerated,
            targetId: lockedReport.id,
            targetType: 'autocare_chat_report_assignment',
            metadata: { threadId: lockedThread.id, requestId: lockedThread.requestId, moderatorId: normalizedInput.moderatorId, reason: normalizedInput.reason, operation: normalizedInput.moderatorId ? 'assigned' : 'unassigned', accessExpiresAt: result.accessExpiresAt?.toISOString() ?? null, reportsUpdated: saved.length },
            request,
        })
        return result
    })
    return reportResponse(assigned, true)
}

export async function extendAdminAutoCareChatModeratorAccess(user: UserEntity, reportId: string, reason: string, request?: FastifyRequest) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only an administrator can extend moderation access.')
    const normalizedReportId = normalizeAutoCareChatReportUuid(reportId)
    const normalizedInput = normalizeAutoCareChatModeratorExtension(reason)
    if (!normalizedReportId || !normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Moderation access extension is invalid.' })
    const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
    const report = await reports.findOneBy({ id: normalizedReportId })
    if (!report) fail(404, 'Chat report not found.')
    if (user.role === UserRole.Admin && report.assignedModeratorId !== user.id) fail(403, 'Only the assigned moderator can extend this access.')
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: report.threadId })
    if (!thread) fail(404, 'Chat not found.')
    if (thread.type !== AutoCareChatThreadType.ServiceRequest || !thread.requestId) fail(409, 'Moderator access can only be extended for a service-request thread.')
    const extended = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        if (lockedThread.type !== AutoCareChatThreadType.ServiceRequest || !lockedThread.requestId) fail(409, 'Moderator access can only be extended for a service-request thread.')
        const lockedReport = await manager.getRepository(AutoCareChatReportEntity).findOne({ where: { id: normalizedReportId }, lock: { mode: 'pessimistic_write' } })
        if (!lockedReport) fail(404, 'Chat report not found.')
        if (lockedReport.status !== AutoCareChatReportStatus.Pending || !lockedReport.assignedModeratorId) fail(409, 'Only an assigned pending report can be extended.')
        if (!lockedReport.reportedMessageId || !lockedReport.acknowledgedAt || !lockedReport.policyVersion) fail(409, 'This report has no message-level consent for moderator access.')
        if (user.role === UserRole.Admin && lockedReport.assignedModeratorId !== user.id) fail(403, 'Only the assigned moderator can extend this access.')
        const pendingReports = (await manager.getRepository(AutoCareChatReportEntity).find({ where: { threadId: thread.id, status: AutoCareChatReportStatus.Pending } })).filter((active) => active.reportedMessageId && active.acknowledgedAt && active.policyVersion && active.assignedModeratorId)
        if (pendingReports.some((active) => active.extensionUsed)) fail(409, 'Moderation access can only be extended once for this service request.')
        if (pendingReports.some((active) => !active.accessExpiresAt || active.accessExpiresAt.getTime() <= Date.now())) fail(409, 'Expired moderation access cannot be extended.')
        if (pendingReports.some((active) => active.assignedModeratorId !== lockedReport.assignedModeratorId)) fail(409, 'Moderator assignment is inconsistent for this service request.')
        const previousExpiry = lockedReport.accessExpiresAt
        if (!previousExpiry || pendingReports.some((active) => active.accessExpiresAt?.getTime() !== previousExpiry.getTime())) fail(409, 'Moderation access expiry is inconsistent for this service request.')
        const now = new Date()
        const accessExpiresAt = calculateAutoCareChatExtendedExpiry(previousExpiry)
        if (!accessExpiresAt) fail(409, 'Expired moderation access cannot be extended.')
        const updated = pendingReports.map((active) => ({ ...active, extensionUsed: true, extensionReason: normalizedInput.reason, extendedAt: now, accessExpiresAt }))
        const saved = await manager.getRepository(AutoCareChatReportEntity).save(updated)
        const result = saved.find((item) => item.id === lockedReport.id) ?? lockedReport
        await recordAuditLog({
            manager,
            actorId: user.id,
            action: AuditAction.ChatReportModerated,
            targetId: lockedReport.id,
            targetType: 'autocare_chat_report_assignment',
            metadata: { threadId: lockedThread.id, requestId: lockedThread.requestId, moderatorId: result.assignedModeratorId, reason: normalizedInput.reason, operation: 'extended', previousAccessExpiresAt: previousExpiry.toISOString(), accessExpiresAt: result.accessExpiresAt?.toISOString() ?? null, extensionUsed: result.extensionUsed, reportsUpdated: saved.length },
            request,
        })
        return result
    })
    return reportResponse(extended, true)
}
