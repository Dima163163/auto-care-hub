import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatThreadEntity, AutoCareChatThreadType, AutoCareChatBlockEntity, AutoCareChatBlockStatus, AutoCareChatReportCategory, AutoCareChatReportEntity, AutoCareChatReportStatus, ServiceMessageEntity, ServiceMessageKind, ServiceRequestEntity } from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { hasProviderWorkspacePermission } from './provider-access.service.js'
import { assertCursorDate, decodeCursor, encodeCursor, getCursorLimit } from '../../shared/http/cursor-pagination.js'
import { normalizeAutoCareChatReportDecision, normalizeAutoCareChatReportInput, normalizeAutoCareChatReportStatus, normalizeAutoCareChatReportUuid, resolveAutoCareChatReportConflict } from './chat-moderation-policy.js'
import { enqueueNotification } from '../outbox/notification-outbox.service.js'
import { assertThreadAccess, getThread, lockThreadForMutation } from './chat-access.service.js'
import { assertRole, fail } from './chat-errors.js'
import { reportResponse } from './chat-moderation-response.js'
import type { CreateAutoCareChatReportInput } from './chat-moderation-response.js'

export async function createAutoCareChatReport(user: UserEntity, chatId: string, input: CreateAutoCareChatReportInput) {
    const normalizedInput = normalizeAutoCareChatReportInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report is invalid.' })
    const thread = await getThread(user, chatId)
    if (user.role === UserRole.Admin || user.role === UserRole.SuperAdmin) fail(403, 'Only chat participants can report a message.')
    if (thread.type !== AutoCareChatThreadType.ServiceRequest || !thread.requestId) fail(400, 'Only service-request messages can be reported.')
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: thread.requestId })
    const canReport = thread.clientId === user.id || (thread.providerId !== null && request !== null && await hasProviderWorkspacePermission(user.id, thread.providerId, 'chats', request.locationId))
    if (!canReport) fail(403, 'Only a participant in this service request can report a message.')

    const report = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        await assertThreadAccess(user, lockedThread)
        if (!lockedThread.requestId) fail(409, 'This thread is no longer a service-request conversation.')
        const message = await manager.getRepository(ServiceMessageEntity).findOne({
            where: [{ id: normalizedInput.reportedMessageId, threadId: lockedThread.id }, { id: normalizedInput.reportedMessageId, requestId: lockedThread.requestId }],
        })
        if (!message || message.deletedAt || message.kind !== ServiceMessageKind.Text || !message.body?.trim() || message.senderId === user.id) fail(400, 'Choose a visible text message sent by the other participant.')
        const reports = manager.getRepository(AutoCareChatReportEntity)
        const pendingReports = await reports.find({ where: { threadId: lockedThread.id, status: AutoCareChatReportStatus.Pending } })
        const currentAssignment = pendingReports.find((pending) => pending.reportedMessageId && pending.acknowledgedAt && pending.policyVersion && pending.assignedModeratorId && pending.accessExpiresAt && pending.accessExpiresAt.getTime() > Date.now())
        // A person already under review cannot file a retaliatory report against
        // a message sent after that case began. Older, distinct incidents remain reportable.
        const conflict = resolveAutoCareChatReportConflict({
            activeReports: pendingReports.map((pending) => ({
                ...pending,
                reporterSide: pending.reporterId === lockedThread.clientId ? 'client' as const : 'provider' as const,
                reportedSide: pending.reportedUserId === lockedThread.clientId ? 'client' as const : 'provider' as const,
            })),
            reporterSide: user.id === lockedThread.clientId ? 'client' : 'provider',
            messageSenderSide: message.senderId === lockedThread.clientId ? 'client' : 'provider',
            messageId: message.id,
            messageCreatedAt: message.createdAt,
            category: normalizedInput.category,
            description: normalizedInput.description,
        })
        if (conflict.blocked) fail(409, 'This message cannot be reported during the current review.', ERROR_CODES.ChatReportConflict)
        const existing = await reports.findOneBy({ threadId: lockedThread.id, reporterId: user.id, reportedMessageId: message.id })
        if (existing) return existing
        const created = await reports.save(reports.create({
            threadId: lockedThread.id,
            reportedMessageId: message.id,
            relatedReportId: conflict.relatedReportId,
            reporterId: user.id,
            reportedUserId: message.senderId,
            category: normalizedInput.category,
            description: normalizedInput.description,
            status: AutoCareChatReportStatus.Pending,
            reviewedById: null,
            resolutionReason: null,
            reviewedAt: null,
            acknowledgedAt: new Date(),
            policyVersion: '2026-09-24-v1',
            assignedModeratorId: currentAssignment?.assignedModeratorId ?? null,
            assignedById: currentAssignment?.assignedById ?? null,
            assignmentReason: currentAssignment?.assignmentReason ?? null,
            assignedAt: currentAssignment?.assignedAt ?? null,
            accessExpiresAt: currentAssignment?.accessExpiresAt ?? null,
            extensionUsed: currentAssignment?.extensionUsed ?? false,
            extensionReason: currentAssignment?.extensionReason ?? null,
            extendedAt: currentAssignment?.extendedAt ?? null,
        }))
        const recipients = currentAssignment?.assignedModeratorId
            ? [currentAssignment.assignedModeratorId]
            : (await manager.getRepository(UserEntity).find({
                where: { role: UserRole.SuperAdmin, status: UserStatus.Active },
                select: { id: true },
            })).map((admin) => admin.id)
        const notificationTemplate = currentAssignment?.assignedModeratorId
            ? 'autocare.chat_report_assigned'
            : 'autocare.chat_report_received'
        for (const recipientId of recipients) {
            await enqueueNotification({
                userId: recipientId,
                category: NotificationCategory.Moderation,
                template: { key: notificationTemplate },
                link: '/admin/dashboard',
                metadata: { reportId: created.id },
            }, `autocare-chat-report:${created.id}:received:${recipientId}`, manager)
        }
        return created
    })
    return reportResponse(report, true)
}

export async function listMyAutoCareChatReports(user: UserEntity, chatId: string, input: { cursor?: string; limit?: number } = {}) {
    const thread = await getThread(user, chatId)
    const limit = getCursorLimit(input.limit, 50)
    const query = AppDataSource.getRepository(AutoCareChatReportEntity).createQueryBuilder('report')
        .where('report.threadId = :threadId', { threadId: thread.id })
        .andWhere('report.reporterId = :reporterId', { reporterId: user.id })
    const totalCount = await query.clone().getCount()
    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        if (!cursor.id) fail(400, 'Chat report cursor is invalid.')
        query.andWhere(
            '(report.createdAt < :cursorCreatedAt OR (report.createdAt = :cursorCreatedAt AND report.id < :cursorId))',
            { cursorCreatedAt, cursorId: cursor.id },
        )
    }
    const rows = await query.orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC').take(limit + 1).getMany()
    const hasMore = rows.length > limit
    const reports = hasMore ? rows.slice(0, limit) : rows
    const lastReport = reports.at(-1)
    return {
        items: reports.map((report) => reportResponse(report, true)),
        nextCursor: hasMore && lastReport
            ? encodeCursor({ createdAt: lastReport.createdAt.toISOString(), id: lastReport.id })
            : null,
        totalCount,
    }
}

export async function listAdminAutoCareChatReports(user: UserEntity, input: {
    status?: AutoCareChatReportStatus
    scope?: 'active' | 'archive'
    search?: string
    assignedModeratorId?: string
    category?: AutoCareChatReportCategory
    cursor?: string
    limit?: number
} = {}) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can review chat reports.')
    const normalizedStatus = input.status === undefined ? undefined : normalizeAutoCareChatReportStatus(input.status)
    if (input.status !== undefined && !normalizedStatus) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report status is invalid.' })
    if (input.scope && ((input.scope === 'active' && normalizedStatus && normalizedStatus !== AutoCareChatReportStatus.Pending)
        || (input.scope === 'archive' && normalizedStatus === AutoCareChatReportStatus.Pending))) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report scope and status do not match.' })
    }
    if (input.assignedModeratorId === 'unassigned' && user.role !== UserRole.SuperAdmin) fail(403, 'Only a super administrator can filter unassigned reports.')
    if (input.assignedModeratorId && input.assignedModeratorId !== 'unassigned' && input.assignedModeratorId !== 'me'
        && user.role !== UserRole.SuperAdmin && input.assignedModeratorId !== user.id) {
        fail(403, 'Administrators can only filter reports assigned to themselves.')
    }
    const assignedModeratorId = input.assignedModeratorId === 'me' ? user.id : input.assignedModeratorId
    const normalizedSearch = input.search?.normalize('NFKC').trim().toLowerCase()
    if (input.search !== undefined && (!normalizedSearch || normalizedSearch.length > 120)) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report search is invalid.' })
    const limit = getCursorLimit(input.limit, 50)
    const query = AppDataSource.getRepository(AutoCareChatReportEntity).createQueryBuilder('report')
    if (normalizedStatus) query.andWhere('report.status = :status', { status: normalizedStatus })
    else if (input.scope === 'active') query.andWhere('report.status = :activeStatus', { activeStatus: AutoCareChatReportStatus.Pending })
    else if (input.scope === 'archive') query.andWhere('report.status IN (:...archiveStatuses)', { archiveStatuses: [AutoCareChatReportStatus.Resolved, AutoCareChatReportStatus.Dismissed] })
    if (input.category) query.andWhere('report.category = :category', { category: input.category })
    if (assignedModeratorId === 'unassigned') query.andWhere('report.assignedModeratorId IS NULL')
    else if (assignedModeratorId) query.andWhere('report.assignedModeratorId = :assignedModeratorId', { assignedModeratorId })
    if (normalizedSearch) {
        query.andWhere(
            '(POSITION(:search IN LOWER(CAST(report.id AS text))) > 0 OR POSITION(:search IN LOWER(CAST(report.threadId AS text))) > 0)',
            { search: normalizedSearch },
        )
    }
    const totalCount = await query.clone().getCount()
    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        if (!cursor.id) fail(400, 'Chat report cursor is invalid.')
        query.andWhere(
            '(report.createdAt < :cursorCreatedAt OR (report.createdAt = :cursorCreatedAt AND report.id < :cursorId))',
            { cursorCreatedAt, cursorId: cursor.id },
        )
    }
    const rows = await query
        .orderBy('report.createdAt', 'DESC')
        .addOrderBy('report.id', 'DESC')
        .take(limit + 1)
        .getMany()
    const hasMore = rows.length > limit
    const reports = hasMore ? rows.slice(0, limit) : rows
    const now = Date.now()
    const items = reports.map((report) => reportResponse(report,
        report.status === AutoCareChatReportStatus.Pending
        && Boolean(report.reportedMessageId && report.acknowledgedAt && report.policyVersion)
        && (user.role === UserRole.SuperAdmin || (report.assignedModeratorId === user.id && Boolean(report.accessExpiresAt && report.accessExpiresAt.getTime() > now))),
    ))
    const lastReport = reports.at(-1)
    return {
        items,
        nextCursor: hasMore && lastReport
            ? encodeCursor({ createdAt: lastReport.createdAt.toISOString(), id: lastReport.id })
            : null,
        totalCount,
    }
}

export async function decideAdminAutoCareChatReport(user: UserEntity, reportId: string, status: AutoCareChatReportStatus.Resolved | AutoCareChatReportStatus.Dismissed, reason?: string | null, blockUser = false, blockDurationDays?: number) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can review chat reports.')
    const normalizedReportId = normalizeAutoCareChatReportUuid(reportId)
    if (!normalizedReportId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report id must be a valid UUID.' })
    const normalizedInput = normalizeAutoCareChatReportDecision(status, reason, blockUser, blockDurationDays)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report decision is invalid.' })
    if (normalizedInput.blockDurationDays === 30 && user.role !== UserRole.SuperAdmin) fail(403, 'Only a super administrator can apply a 30-day chat restriction.')
    const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
    const report = await reports.findOneBy({ id: normalizedReportId })
    if (!report) fail(404, 'Chat report not found.')
    if (report.status !== AutoCareChatReportStatus.Pending) return reportResponse(report)
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: report.threadId })
    if (!thread) fail(404, 'Chat not found.')
    const result = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        const lockedReports = manager.getRepository(AutoCareChatReportEntity)
        const lockedReport = await lockedReports.findOne({ where: { id: normalizedReportId }, lock: { mode: 'pessimistic_write' } })
        if (!lockedReport) fail(404, 'Chat report not found.')
        if (lockedReport.status !== AutoCareChatReportStatus.Pending) return lockedReport
        if ((!lockedReport.reportedMessageId || !lockedReport.acknowledgedAt || !lockedReport.policyVersion) && user.role === UserRole.SuperAdmin && (normalizedInput.reason?.length ?? 0) < 10) {
            fail(400, 'A reason of at least 10 characters is required to close a legacy report without consent metadata.')
        }
        if (user.role === UserRole.Admin && (lockedReport.assignedModeratorId !== user.id || !lockedReport.reportedMessageId || !lockedReport.acknowledgedAt || !lockedReport.policyVersion)) {
            fail(403, 'Only the assigned moderator can decide an active consented case.')
        }
        await assertThreadAccess(user, lockedThread)
        if (user.role === UserRole.Admin && (!lockedReport.accessExpiresAt || lockedReport.accessExpiresAt.getTime() <= Date.now())) fail(403, 'Moderation access has expired.', ERROR_CODES.ChatModerationAccessExpired)
        lockedReport.status = normalizedInput.status
        lockedReport.reviewedById = user.id
        lockedReport.resolutionReason = normalizedInput.reason
        lockedReport.reviewedAt = new Date()
        const savedReport = await lockedReports.save(lockedReport)
        const evidenceRetainUntil = new Date(Date.now() + 90 * 24 * 60 * 60_000)
        await manager.query(
            `UPDATE "autocare_service_messages"
             SET "evidenceRetainUntil" = GREATEST(COALESCE("evidenceRetainUntil", $1), $1)
             WHERE "threadId" = $2 OR ("requestId" = $3 AND "requestId" IS NOT NULL)`,
            [evidenceRetainUntil, lockedThread.id, lockedThread.requestId],
        )
        if (normalizedInput.blockUser && lockedReport.reportedUserId) {
            const blocks = manager.getRepository(AutoCareChatBlockEntity)
            const expiresAt = new Date(Date.now() + (normalizedInput.blockDurationDays ?? 1) * 24 * 60 * 60_000)
            await blocks.save(blocks.create({
                threadId: lockedThread.id,
                blockerId: user.id,
                blockedUserId: lockedReport.reportedUserId,
                sourceReportId: lockedReport.id,
                status: AutoCareChatBlockStatus.Active,
                reason: normalizedInput.reason,
                expiresAt,
                revokedAt: null,
            }))
        }
        await enqueueNotification({
            userId: lockedReport.reporterId,
            category: NotificationCategory.Moderation,
            template: { key: normalizedInput.status === AutoCareChatReportStatus.Resolved ? 'autocare.chat_report_resolved' : 'autocare.chat_report_dismissed' },
            link: `/chats?chat=${encodeURIComponent(lockedThread.id)}`,
            metadata: { reportId: lockedReport.id, threadId: lockedThread.id, outcome: normalizedInput.status },
        }, `autocare-chat-report:${lockedReport.id}:${normalizedInput.status}`, manager)
        return savedReport
    })
    return reportResponse(result)
}
