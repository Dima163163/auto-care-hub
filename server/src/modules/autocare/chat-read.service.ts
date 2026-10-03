import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareChatThreadEntity, AutoCareChatBlockEntity, AutoCareChatBlockStatus,
    AutoCareAppealEntity, AutoCareAppealStatus, AutoCareAppealSubject,
    AutomotiveProviderEntity, ServiceMessageEntity, ServiceRequestEntity,
} from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { assertCursorDate, decodeCursor, encodeCursor, getCursorLimit, isCursorPaginationRequested, normalizeCursorPaginationInput } from '../../shared/http/cursor-pagination.js'
import { getManagedProviderPermissionScopes } from './provider-access.service.js'
import type { AutoCareChatThreadResponse } from './autocare.types.js'

async function loadThreadSummaries(user: UserEntity, threads: AutoCareChatThreadEntity[]) {
    const ids = threads.map((thread) => thread.id)
    const providerIds = [...new Set(threads.flatMap((thread) => thread.providerId ? [thread.providerId] : []))]
    const [providers, counts, sanctions] = await Promise.all([
        providerIds.length ? AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) } }) : [],
        AppDataSource.getRepository(ServiceMessageEntity).createQueryBuilder('message')
            .innerJoin(AutoCareChatThreadEntity, 'thread', '(message.threadId = thread.id OR message.requestId = thread.requestId)')
            .select('thread.id', 'threadId').addSelect('COUNT(message.id)', 'count')
            .where('thread.id IN (:...ids)', { ids }).andWhere('message.senderId <> :userId', { userId: user.id })
            .andWhere('message.readAt IS NULL').groupBy('thread.id').getRawMany<{ threadId: string; count: string }>(),
        AppDataSource.getRepository(AutoCareChatBlockEntity).createQueryBuilder('block')
            .distinctOn(['block.threadId']).where('block.threadId IN (:...ids)', { ids })
            .andWhere('block.blockedUserId = :userId', { userId: user.id })
            .andWhere('block.status = :status', { status: AutoCareChatBlockStatus.Active })
            .andWhere('block.sourceReportId IS NOT NULL').orderBy('block.threadId', 'ASC').addOrderBy('block.createdAt', 'DESC').getMany(),
    ])
    const appeals = sanctions.length ? await AppDataSource.getRepository(AutoCareAppealEntity).find({
        where: { subject: AutoCareAppealSubject.ChatRestriction, subjectId: In(sanctions.map((item) => item.id)), submittedById: user.id, status: AutoCareAppealStatus.Pending },
    }) : []
    return {
        providerById: new Map(providers.map((provider) => [provider.id, provider])),
        unreadByThreadId: new Map(counts.map((row) => [row.threadId, Number(row.count)])),
        sanctionByThreadId: new Map(sanctions.map((sanction) => [sanction.threadId, sanction])),
        appealBySubjectId: new Map(appeals.map((appeal) => [appeal.subjectId, appeal])),
    }
}

export async function toThreadResponse(user: UserEntity, thread: AutoCareChatThreadEntity, summary?: Awaited<ReturnType<typeof loadThreadSummaries>>): Promise<AutoCareChatThreadResponse> {
    const context = summary ?? await loadThreadSummaries(user, [thread])
    const provider = thread.providerId ? context.providerById.get(thread.providerId) : null
    const sanction = context.sanctionByThreadId.get(thread.id)
    const sanctionAppeal = sanction ? context.appealBySubjectId.get(sanction.id) : null
    return {
        id: thread.id, type: thread.type, status: thread.status, subject: thread.subject,
        requestId: thread.requestId, providerId: thread.providerId, providerName: provider?.name ?? null,
        clientId: thread.clientId, lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
        unreadCount: context.unreadByThreadId.get(thread.id) ?? 0,
        moderationRestriction: sanction?.sourceReportId && sanction.reason && sanction.expiresAt ? {
            id: sanction.id, reason: sanction.reason, expiresAt: sanction.expiresAt.toISOString(),
            state: sanction.expiresAt.getTime() > Date.now() ? 'active' : 'expired', appealStatus: sanctionAppeal?.status ?? null,
        } : null,
        createdAt: thread.createdAt.toISOString(), updatedAt: thread.updatedAt.toISOString(),
    }
}

export async function getMyAutoCareChats(user: UserEntity, input: unknown = {}) {
    const normalized = normalizeCursorPaginationInput(input)
    if (!normalized || normalized.beforeCursor) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Thread pagination is invalid.' })
    const scopes = await getManagedProviderPermissionScopes(user.id, 'chats')
    if (user.role === UserRole.Owner && !scopes.length) return isCursorPaginationRequested(normalized) ? { items: [], nextCursor: null } : []
    const query = AppDataSource.getRepository(AutoCareChatThreadEntity).createQueryBuilder('thread')
        .leftJoin(ServiceRequestEntity, 'request', 'request.id = thread.requestId AND request.providerId = thread.providerId')
    const clauses: string[] = []
    const parameters: Record<string, unknown> = { userId: user.id }
    if (user.role === UserRole.Client) clauses.push('thread.clientId = :userId')
    if (scopes.length) {
        clauses.push("(thread.createdById = :userId AND thread.type = 'support')")
        for (const [index, scope] of scopes.entries()) {
            if (scope.locationIds?.length === 0) continue
            parameters[`provider${index}`] = scope.providerId
            if (scope.locationIds) parameters[`locations${index}`] = scope.locationIds
            clauses.push(`(thread.providerId = :provider${index}${scope.locationIds ? ` AND request.locationId IN (:...locations${index})` : ''})`)
        }
    } else if (user.role === UserRole.SuperAdmin) clauses.push('TRUE')
    else if (user.role === UserRole.Admin) {
        clauses.push("thread.type IN ('support', 'admin_escalation')")
        clauses.push(`thread.type = 'service_request' AND thread.requestId IS NOT NULL AND EXISTS (SELECT 1 FROM autocare_chat_reports report WHERE report."threadId" = thread.id
            AND report.status = 'pending' AND report."assignedModeratorId" = :userId AND report."accessExpiresAt" > :now
            AND report."reportedMessageId" IS NOT NULL AND report."acknowledgedAt" IS NOT NULL AND report."policyVersion" IS NOT NULL)`)
        parameters.now = new Date()
    }
    if (!clauses.length) return isCursorPaginationRequested(normalized) ? { items: [], nextCursor: null } : []
    query.where(`(${clauses.join(' OR ')})`, parameters)
    if (normalized.cursor) {
        const cursor = decodeCursor(normalized.cursor, ['updatedAt', 'id'])
        query.andWhere('(thread.updatedAt < :updatedAt OR (thread.updatedAt = :updatedAt AND thread.id < :id))', { updatedAt: assertCursorDate(cursor, 'updatedAt'), id: cursor.id })
    }
    const limit = getCursorLimit(normalized.limit ?? 100)
    const threads = await query.orderBy('thread.updatedAt', 'DESC').addOrderBy('thread.id', 'DESC').take(limit + 1).getMany()
    const page = threads.slice(0, limit)
    const summary = page.length ? await loadThreadSummaries(user, page) : null
    const items = summary ? await Promise.all(page.map((thread) => toThreadResponse(user, thread, summary))) : []
    if (!isCursorPaginationRequested(normalized)) return items
    const last = page.at(-1)
    return { items, nextCursor: threads.length > limit && last ? encodeCursor({ updatedAt: last.updatedAt.toISOString(), id: last.id }) : null }
}

