import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
    hasProviderWorkspacePermission: vi.fn(),
    saveAttachmentObject: vi.fn(),
    removeAttachmentObject: vi.fn(),
    decodeAttachment: vi.fn(),
    normalizeAttachment: vi.fn(),
    broadcastServiceChat: vi.fn(),
    enqueueNotification: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))
vi.mock('./provider-access.service.js', () => ({
    getManagedProviderPermissionScopes: vi.fn(),
    hasProviderWorkspacePermission: mocks.hasProviderWorkspacePermission,
    isManagedProviderLocationAllowed: vi.fn(),
}))
vi.mock('./autocare-attachment-storage.js', () => ({
    assertAutoCareAttachmentObjectKeyOwnedBy: vi.fn(),
    createAutoCareAttachmentObjectKey: vi.fn(() => 'autocare-chats/thread-1/object-1.bin'),
    getAutoCareAttachmentSignedDownloadUrl: vi.fn(),
    readAutoCareAttachmentObject: vi.fn(),
    removeAutoCareAttachmentObject: mocks.removeAttachmentObject,
    saveAutoCareAttachmentObject: mocks.saveAttachmentObject,
}))
vi.mock('./service-chat.gateway.js', () => ({ broadcastServiceChat: mocks.broadcastServiceChat }))
vi.mock('../outbox/notification-outbox.service.js', () => ({ enqueueNotification: mocks.enqueueNotification }))
vi.mock('./attachment-content.js', () => ({
    assertAutoCareAttachmentQuota: vi.fn(),
    decodeAutoCareAttachment: mocks.decodeAttachment,
    normalizeAutoCareAttachment: mocks.normalizeAttachment,
    normalizeAutoCareAttachmentInput: vi.fn((input: unknown) => input && typeof input === 'object' ? input : null),
    resolveAutoCareAttachmentContentType: vi.fn((contentType: string) => contentType),
}))

import {
    AutoCareChatBlockEntity,
    AutoCareChatBlockStatus,
    AutoCareChatReportEntity,
    AutoCareChatReportStatus,
    AutoCareChatThreadEntity,
    AutoCareChatThreadStatus,
    AutoCareChatThreadType,
    AutomotiveProviderEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
} from '../../entities/index.js'
import { AutoCareChatReportCategory } from '../../entities/automotive/chat-moderation.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import {
    assertAutoCareChatRealtimeAccess,
    getAutoCareChatAccessContext,
    createAutoCareChat,
    createAutoCareChatAttachment,
    createAutoCareChatBlock,
    createAutoCareChatMessage,
    createAutoCareChatReport,
    deleteAutoCareChatMessage,
    decideAdminAutoCareChatReport,
    getAutoCareChat,
    getAutoCareChatAttachment,
    getAutoCareChatThreadForRequest,
    listAdminAutoCareChatReports,
    listMyAutoCareChatReports,
    markAutoCareChatRead,
    revokeAutoCareChatBlock,
} from './autocare-chat.service.js'

const chatId = '11111111-1111-4111-8111-111111111111'
const client = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Client } as unknown as UserEntity
const admin = { id: '33333333-3333-4333-8333-333333333333', role: UserRole.Admin } as unknown as UserEntity
const superAdmin = { id: '44444444-4444-4444-8444-444444444444', role: UserRole.SuperAdmin } as unknown as UserEntity
const owner = { id: '55555555-5555-4555-8555-555555555555', role: UserRole.Owner } as unknown as UserEntity

function makeThread(overrides: Partial<AutoCareChatThreadEntity> = {}): AutoCareChatThreadEntity {
    return {
        id: chatId,
        type: AutoCareChatThreadType.ProviderInquiry,
        requestId: null,
        providerId: null,
        clientId: client.id,
        createdById: client.id,
        subject: 'Question',
        status: AutoCareChatThreadStatus.Open,
        lastMessageAt: null,
        createdAt: new Date('2026-09-20T10:00:00.000Z'),
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
        ...overrides,
    } as AutoCareChatThreadEntity
}

function setupReadAccess(input: {
    thread?: AutoCareChatThreadEntity
    report?: Partial<AutoCareChatReportEntity> | null
    blocks?: Partial<AutoCareChatBlockEntity>[]
    provider?: Partial<AutomotiveProviderEntity> | null
} = {}) {
    const thread = input.thread ?? makeThread()
    const report = input.report ?? null
    const blocks = input.blocks ?? []
    const provider = input.provider ?? null

    mocks.getRepository.mockImplementation((entity: unknown) => {
        if (entity === AutoCareChatThreadEntity) return { findOneBy: vi.fn().mockResolvedValue(thread) }
        if (entity === AutoCareChatReportEntity) return {
            find: vi.fn((options: { where: Partial<AutoCareChatReportEntity> }) => Promise.resolve(
                report && (!options.where.status || report.status === options.where.status)
                    && (!options.where.assignedModeratorId || report.assignedModeratorId === options.where.assignedModeratorId)
                    ? [report]
                    : [],
            )),
            findOne: vi.fn((options: { where: Partial<AutoCareChatReportEntity> }) => Promise.resolve(
                report && (!options.where.status || report.status === options.where.status)
                    && (!options.where.assignedModeratorId || report.assignedModeratorId === options.where.assignedModeratorId)
                    ? report
                    : null,
            )),
        }
        if (entity === AutoCareChatBlockEntity) return { find: vi.fn().mockResolvedValue(blocks) }
        if (entity === AutomotiveProviderEntity) return { findOneBy: vi.fn().mockResolvedValue(provider) }
        return {}
    })
    mocks.hasProviderWorkspacePermission.mockResolvedValue(false)
    return thread
}

describe('AutoCare chat service boundaries', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
        mocks.hasProviderWorkspacePermission.mockReset()
        mocks.saveAttachmentObject.mockReset()
        mocks.removeAttachmentObject.mockReset()
        mocks.removeAttachmentObject.mockResolvedValue(undefined)
        mocks.decodeAttachment.mockReset()
        mocks.normalizeAttachment.mockReset()
        mocks.broadcastServiceChat.mockReset()
        mocks.enqueueNotification.mockReset().mockResolvedValue(undefined)
    })

    it('rejects malformed chat creation before provider or thread lookup', async () => {
        await expect(createAutoCareChat(client, null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareChat(client, { type: 'admin_escalation', subject: 'Platform support' })).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects malformed chat and request ids before repository access', async () => {
        await expect(getAutoCareChat(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(markAutoCareChatRead(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareChatThreadForRequest(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed message, report, block and attachment input before chat lookup', async () => {
        await expect(createAutoCareChatMessage(client, 'not-a-uuid', null)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareChatReport(client, 'not-a-uuid', { category: AutoCareChatReportCategory.Threat, messageId: 'not-a-uuid', acknowledgeFullThreadReview: true })).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareChatBlock(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareChatAttachment(client, 'not-a-uuid', null as never)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('does not allow a participant to delete another sender’s message', async () => {
        const thread = makeThread({ type: AutoCareChatThreadType.ServiceRequest, requestId: '66666666-6666-4666-8666-666666666666' })
        const otherMessage = { id: '77777777-7777-4777-8777-777777777777', senderId: '88888888-8888-4888-8888-888888888888', kind: 'text', body: 'private', offer: null, deletedAt: null, deletedById: null, createdAt: new Date() }
        const manager = {
            getRepository(entity: unknown) {
                if (entity === AutoCareChatThreadEntity) return { findOne: vi.fn().mockResolvedValue(thread) }
                if (entity === ServiceRequestEntity) return { findOne: vi.fn().mockResolvedValue({ id: thread.requestId }) }
                if (entity === ServiceMessageEntity) return { findOne: vi.fn().mockResolvedValue(otherMessage), save: vi.fn() }
                return {}
            },
        }
        setupReadAccess({ thread })
        mocks.transaction.mockImplementation(async (operation: (manager: typeof manager) => Promise<unknown>) => operation(manager))

        await expect(deleteAutoCareChatMessage(client, chatId, otherMessage.id)).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.broadcastServiceChat).not.toHaveBeenCalled()
    })

    it('keeps pending-report messages undeletable without exposing the case status', async () => {
        const thread = makeThread({ type: AutoCareChatThreadType.ServiceRequest, requestId: '66666666-6666-4666-8666-666666666666' })
        const ownMessage = { id: '77777777-7777-4777-8777-777777777777', senderId: client.id, kind: 'text', body: 'my message', offer: null, deletedAt: null, deletedById: null, createdAt: new Date() }
        const save = vi.fn()
        const manager = {
            getRepository(entity: unknown) {
                if (entity === AutoCareChatThreadEntity) return { findOne: vi.fn().mockResolvedValue(thread) }
                if (entity === ServiceRequestEntity) return { findOne: vi.fn().mockResolvedValue({ id: thread.requestId }) }
                if (entity === ServiceMessageEntity) return { findOne: vi.fn().mockResolvedValue(ownMessage), save }
                if (entity === AutoCareChatReportEntity) return { findOneBy: vi.fn().mockResolvedValue({ id: 'case-1' }) }
                return {}
            },
        }
        setupReadAccess({ thread })
        mocks.transaction.mockImplementation(async (operation: (manager: typeof manager) => Promise<unknown>) => operation(manager))

        await expect(deleteAutoCareChatMessage(client, chatId, ownMessage.id)).rejects.toMatchObject({ statusCode: 409, message: 'This message is temporarily preserved as evidence for a chat report.' })
        expect(save).not.toHaveBeenCalled()
        expect(mocks.broadcastServiceChat).not.toHaveBeenCalled()
    })

    it('rejects an invalid idempotency key before chat lookup', async () => {
        await expect(createAutoCareChatMessage(client, chatId, { body: 'Hello' }, 'bad key')).rejects.toMatchObject({ statusCode: 400 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('validates attachment and block identifiers before repository access', async () => {
        await expect(getAutoCareChatAttachment(client, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(revokeAutoCareChatBlock(client, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('does not let ordinary moderators create or revoke chat blocks outside a reviewed decision', async () => {
        const thread = makeThread()
        const block = { id: '77777777-7777-4777-8777-777777777777', threadId: chatId, blockerId: client.id, blockedUserId: '88888888-8888-4888-8888-888888888888', status: AutoCareChatBlockStatus.Active, reason: null, revokedAt: null }
        const save = vi.fn()
        const manager = {
            getRepository(entity: unknown) {
                if (entity === AutoCareChatThreadEntity) return { findOne: vi.fn().mockResolvedValue(thread) }
                if (entity === AutoCareChatBlockEntity) return { findOneBy: vi.fn().mockResolvedValue(block), save }
                return {}
            },
        }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutoCareChatThreadEntity
            ? { findOneBy: vi.fn().mockResolvedValue(thread) }
            : {})
        mocks.transaction.mockImplementation(async (operation: (manager: typeof manager) => Promise<unknown>) => operation(manager))

        await expect(createAutoCareChatBlock(admin, chatId, client.id, 'Moderation action')).rejects.toMatchObject({ statusCode: 403 })
        await expect(revokeAutoCareChatBlock(admin, chatId, block.id)).rejects.toMatchObject({ statusCode: 403 })
        expect(save).not.toHaveBeenCalled()
    })

    it('limits private complaint details to an active moderation grant', async () => {
        const report = {
            id: '99999999-9999-4999-8999-999999999999',
            threadId: chatId,
            reportedMessageId: '77777777-7777-4777-8777-777777777777',
            reporterId: client.id,
            reportedUserId: '88888888-8888-4888-8888-888888888888',
            category: AutoCareChatReportCategory.Harassment,
            description: 'Private report details',
            status: AutoCareChatReportStatus.Dismissed,
            reviewedById: admin.id,
            resolutionReason: 'Reviewed with sufficient context',
            assignedModeratorId: admin.id,
            accessExpiresAt: new Date(Date.now() + 60_000),
            extensionUsed: false,
            createdAt: new Date(),
            reviewedAt: new Date(),
            acknowledgedAt: new Date(),
            policyVersion: 'v1',
        }
        const reportQuery = {
            andWhere: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            addOrderBy: vi.fn().mockReturnThis(),
            take: vi.fn().mockReturnThis(),
            clone: vi.fn().mockReturnThis(),
            getCount: vi.fn().mockResolvedValue(1),
            getMany: vi.fn().mockResolvedValue([report]),
        }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutoCareChatReportEntity
            ? { createQueryBuilder: vi.fn(() => reportQuery) }
            : {})

        await expect(listAdminAutoCareChatReports(admin)).resolves.toMatchObject({
            items: [{ status: AutoCareChatReportStatus.Dismissed, description: null, resolutionReason: null }],
            nextCursor: null,
            totalCount: 1,
        })
    })

    it('keeps admin authorization ahead of report list and decision validation', async () => {
        await expect(listAdminAutoCareChatReports(client, { status: 'unknown' as never })).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAdminAutoCareChatReport(client, 'not-a-uuid', 'resolved' as never)).rejects.toMatchObject({ statusCode: 403 })
        await expect(listAdminAutoCareChatReports(admin, { status: 'unknown' as never })).rejects.toMatchObject({ statusCode: 422 })
        await expect(decideAdminAutoCareChatReport(admin, 'not-a-uuid', 'resolved' as never)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('applies server report filters before calculating counts and fetching a page', async () => {
        const filterCalls: Array<[string, Record<string, unknown> | undefined]> = []
        const count = vi.fn().mockResolvedValue(0)
        const query = {
            andWhere: vi.fn((sql: string, params?: Record<string, unknown>) => { filterCalls.push([sql, params]); return query }),
            orderBy: vi.fn().mockReturnThis(),
            addOrderBy: vi.fn().mockReturnThis(),
            take: vi.fn().mockReturnThis(),
            clone: vi.fn(() => ({ getCount: count })),
            getMany: vi.fn().mockResolvedValue([]),
        }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutoCareChatReportEntity
            ? { createQueryBuilder: vi.fn(() => query) }
            : {})

        await expect(listAdminAutoCareChatReports(superAdmin, {
            scope: 'active',
            search: '  CASE-42  ',
            assignedModeratorId: 'unassigned',
            category: AutoCareChatReportCategory.Threat,
            limit: 20,
        })).resolves.toMatchObject({ items: [], nextCursor: null, totalCount: 0 })

        expect(filterCalls).toHaveLength(4)
        expect(filterCalls[0]).toEqual(['report.status = :activeStatus', { activeStatus: AutoCareChatReportStatus.Pending }])
        expect(filterCalls[1]).toEqual(['report.category = :category', { category: AutoCareChatReportCategory.Threat }])
        expect(filterCalls[2]?.[0]).toBe('report.assignedModeratorId IS NULL')
        expect(filterCalls[3]?.[1]).toEqual({ search: 'case-42' })
        expect(count).toHaveBeenCalledOnce()
        expect(query.take).toHaveBeenCalledWith(21)
    })

    it('returns a paged report history scoped to the authenticated reporter and chat', async () => {
        const createdAt = new Date('2026-09-20T10:00:00.000Z')
        const report = {
            id: '77777777-7777-4777-8777-777777777777',
            threadId: chatId,
            reportedMessageId: '88888888-8888-4888-8888-888888888888',
            relatedReportId: null,
            reporterId: client.id,
            reportedUserId: owner.id,
            category: AutoCareChatReportCategory.Harassment,
            description: 'My report context',
            status: AutoCareChatReportStatus.Pending,
            reviewedById: null,
            resolutionReason: null,
            overturnedAt: null,
            assignedModeratorId: null,
            accessExpiresAt: null,
            extensionUsed: false,
            createdAt,
            reviewedAt: null,
            acknowledgedAt: createdAt,
            policyVersion: 'v1',
        } as AutoCareChatReportEntity
        const query = {
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            addOrderBy: vi.fn().mockReturnThis(),
            take: vi.fn().mockReturnThis(),
            clone: vi.fn(() => ({ getCount: vi.fn().mockResolvedValue(1) })),
            getMany: vi.fn().mockResolvedValue([report]),
        }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutoCareChatThreadEntity) return { findOneBy: vi.fn().mockResolvedValue(makeThread()) }
            if (entity === AutoCareChatReportEntity) return { createQueryBuilder: vi.fn(() => query) }
            return {}
        })

        await expect(listMyAutoCareChatReports(client, chatId, { limit: 1 })).resolves.toMatchObject({
            items: [{ id: report.id, reporterId: client.id, description: 'My report context' }],
            nextCursor: null,
            totalCount: 1,
        })
        expect(query.where).toHaveBeenCalledWith('report.threadId = :threadId', { threadId: chatId })
        expect(query.andWhere).toHaveBeenCalledWith('report.reporterId = :reporterId', { reporterId: client.id })
    })

    it.each([
        ['no report', null],
        ['dismissed report', { status: AutoCareChatReportStatus.Dismissed }],
        ['resolved report', { status: AutoCareChatReportStatus.Resolved }],
    ])('denies ordinary-admin access with %s', async (_label, report) => {
        setupReadAccess({ thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest }), report })

        await expect(assertAutoCareChatRealtimeAccess(admin, chatId)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('allows ordinary-admin review only while assigned and within the time window, while preserving support access', async () => {
        setupReadAccess({
            thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest, requestId: '66666666-6666-4666-8666-666666666666' }),
            report: { status: AutoCareChatReportStatus.Pending, reportedMessageId: '77777777-7777-4777-8777-777777777777', acknowledgedAt: new Date(), policyVersion: 'v1', assignedModeratorId: admin.id, accessExpiresAt: new Date(Date.now() + 60_000) },
        })
        await expect(assertAutoCareChatRealtimeAccess(admin, chatId)).resolves.toBe(true)

        setupReadAccess({
            thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest, requestId: '66666666-6666-4666-8666-666666666666' }),
            report: { status: AutoCareChatReportStatus.Pending, assignedModeratorId: '99999999-9999-4999-8999-999999999999', accessExpiresAt: new Date(Date.now() + 60_000) },
        })
        await expect(assertAutoCareChatRealtimeAccess(admin, chatId)).rejects.toMatchObject({ statusCode: 403 })

        setupReadAccess({
            thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest }),
            report: { status: AutoCareChatReportStatus.Pending, assignedModeratorId: admin.id, accessExpiresAt: new Date(Date.now() - 60_000) },
        })
        await expect(assertAutoCareChatRealtimeAccess(admin, chatId)).rejects.toMatchObject({ statusCode: 403 })

        setupReadAccess({ thread: makeThread({ type: AutoCareChatThreadType.Support }), report: null })
        await expect(assertAutoCareChatRealtimeAccess(admin, chatId)).resolves.toBe(true)

        setupReadAccess({ thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest }), report: null })
        await expect(assertAutoCareChatRealtimeAccess(superAdmin, chatId)).resolves.toBe(true)
    })

    it('returns content-free, explicit scope metadata after authorizing the chat', async () => {
        setupReadAccess({
            thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest, requestId: '66666666-6666-4666-8666-666666666666' }),
            report: { status: AutoCareChatReportStatus.Pending, reportedMessageId: '77777777-7777-4777-8777-777777777777', acknowledgedAt: new Date(), policyVersion: 'v1', assignedModeratorId: admin.id, accessExpiresAt: new Date(Date.now() + 60_000) },
        })

        await expect(getAutoCareChatAccessContext(admin, chatId)).resolves.toEqual({
            threadId: chatId,
            requestId: '66666666-6666-4666-8666-666666666666',
            threadType: AutoCareChatThreadType.ServiceRequest,
            accessScope: 'pending_report_moderation',
        })
    })

    it('fails closed for assigned but unanchored legacy reports and requires SuperAdmin emergency reasons', async () => {
        setupReadAccess({
            thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest }),
            report: { status: AutoCareChatReportStatus.Pending, assignedModeratorId: admin.id, accessExpiresAt: new Date(Date.now() + 60_000) },
        })
        await expect(assertAutoCareChatRealtimeAccess(admin, chatId)).rejects.toMatchObject({ statusCode: 403 })

        setupReadAccess({ thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest }) })
        await expect(getAutoCareChatAccessContext(superAdmin, chatId)).rejects.toMatchObject({ statusCode: 400 })
        await expect(getAutoCareChatAccessContext(superAdmin, chatId, 'Urgent review of a safety complaint')).resolves.toMatchObject({ accessScope: 'super_admin', emergencyReason: 'Urgent review of a safety complaint' })
    })

    it('does not let a provider from another workspace open the chat', async () => {
        setupReadAccess({
            thread: makeThread({ providerId: '66666666-6666-4666-8666-666666666666', clientId: '77777777-7777-4777-8777-777777777777' }),
            provider: { id: '66666666-6666-4666-8666-666666666666', ownerId: '88888888-8888-4888-8888-888888888888' },
        })

        await expect(assertAutoCareChatRealtimeAccess(owner, chatId)).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.hasProviderWorkspacePermission).toHaveBeenCalledWith(owner.id, '66666666-6666-4666-8666-666666666666', 'chats', null)
    })

    it.each([admin, superAdmin])('prevents %s from posting to private request threads', async (moderator) => {
        setupReadAccess({
            thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest, requestId: '66666666-6666-4666-8666-666666666666' }),
            report: moderator === admin ? { status: AutoCareChatReportStatus.Pending, reportedMessageId: '77777777-7777-4777-8777-777777777777', acknowledgedAt: new Date(), policyVersion: 'v1', assignedModeratorId: admin.id, accessExpiresAt: new Date(Date.now() + 60_000) } : null,
        })

        await expect(createAutoCareChatMessage(moderator, chatId, { body: 'Moderator reply' })).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it.each([admin, superAdmin])('prevents %s from adding attachments to private request threads', async (moderator) => {
        setupReadAccess({
            thread: makeThread({ type: AutoCareChatThreadType.ServiceRequest, requestId: '66666666-6666-4666-8666-666666666666' }),
            report: moderator === admin ? { status: AutoCareChatReportStatus.Pending, reportedMessageId: '77777777-7777-4777-8777-777777777777', acknowledgedAt: new Date(), policyVersion: 'v1', assignedModeratorId: admin.id, accessExpiresAt: new Date(Date.now() + 60_000) } : null,
        })
        await expect(createAutoCareChatAttachment(moderator, chatId, {
            fileName: 'photo.png',
            contentType: 'image/png',
            size: 4,
            contentBase64: 'iVBORw==',
        })).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.saveAttachmentObject).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('checks block state again under the persistence transaction before saving a message', async () => {
        const thread = makeThread()
        const blocked = { threadId: chatId, blockerId: 'other-user', blockedUserId: client.id, status: AutoCareChatBlockStatus.Active }
        const findBlocks = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([blocked])
        const messageSave = vi.fn()
        const threadSave = vi.fn()
        const messageRepository = { create: vi.fn((value) => value), save: messageSave, findOneBy: vi.fn() }
        const threadRepository = { findOneBy: vi.fn().mockResolvedValue(thread), findOne: vi.fn().mockResolvedValue(thread), save: threadSave }
        const manager = {
            getRepository(entity: unknown) {
                if (entity === AutoCareChatThreadEntity) return threadRepository
                if (entity === AutoCareChatBlockEntity) return { find: findBlocks }
                if (entity === ServiceMessageEntity) return messageRepository
                if (entity === ServiceRequestEntity) return { findOne: vi.fn() }
                return {}
            },
        }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutoCareChatThreadEntity) return threadRepository
            if (entity === AutoCareChatBlockEntity) return { find: findBlocks }
            if (entity === AutomotiveProviderEntity) return { findOneBy: vi.fn().mockResolvedValue(null) }
            return {}
        })
        mocks.transaction.mockImplementation(async (operation: (manager: typeof manager) => Promise<unknown>) => operation(manager))

        await expect(createAutoCareChatMessage(client, chatId, { body: 'Blocked attempt' })).rejects.toMatchObject({ statusCode: 403 })
        expect(messageSave).not.toHaveBeenCalled()
        expect(threadSave).not.toHaveBeenCalled()
        expect(mocks.broadcastServiceChat).not.toHaveBeenCalled()
        expect(findBlocks).toHaveBeenCalledTimes(2)
    })

    it('rejects a blocked generic-chat attachment before uploading the object', async () => {
        setupReadAccess({
            blocks: [{ threadId: chatId, blockerId: 'other-user', blockedUserId: client.id, status: AutoCareChatBlockStatus.Active }],
        })

        await expect(createAutoCareChatAttachment(client, chatId, {
            fileName: 'photo.png',
            contentType: 'image/png',
            size: 4,
            contentBase64: 'iVBORw==',
        })).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.saveAttachmentObject).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('removes an uploaded object when a block becomes active before attachment persistence', async () => {
        const thread = makeThread()
        const blocked = { threadId: chatId, blockerId: 'other-user', blockedUserId: client.id, status: AutoCareChatBlockStatus.Active }
        const findBlocks = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([blocked])
        const threadRepository = { findOneBy: vi.fn().mockResolvedValue(thread), findOne: vi.fn().mockResolvedValue(thread) }
        const manager = {
            getRepository(entity: unknown) {
                if (entity === AutoCareChatThreadEntity) return threadRepository
                if (entity === AutoCareChatBlockEntity) return { find: findBlocks }
                if (entity === ServiceRequestEntity) return { findOne: vi.fn() }
                return {}
            },
        }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutoCareChatThreadEntity) return threadRepository
            if (entity === AutoCareChatBlockEntity) return { find: findBlocks }
            return {}
        })
        mocks.transaction.mockImplementation(async (operation: (manager: typeof manager) => Promise<unknown>) => operation(manager))
        mocks.decodeAttachment.mockReturnValue(Buffer.from('image'))
        mocks.normalizeAttachment.mockResolvedValue(Buffer.from('normalized-image'))
        mocks.saveAttachmentObject.mockResolvedValue(undefined)

        await expect(createAutoCareChatAttachment(client, chatId, {
            fileName: 'photo.png',
            contentType: 'image/png',
            size: 4,
            contentBase64: 'iVBORw==',
        })).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.saveAttachmentObject).toHaveBeenCalledOnce()
        expect(mocks.removeAttachmentObject).toHaveBeenCalledWith('autocare-chats/thread-1/object-1.bin')
    })

    it('returns the saved message once per idempotency key and rejects a changed payload', async () => {
        const thread = makeThread({ providerId: '99999999-9999-4999-8999-999999999999' })
        const savedMessages: Record<string, unknown>[] = []
        let messageNumber = 0
        const messageRepository = {
            create: vi.fn((value: Record<string, unknown>) => value),
            findOneBy: vi.fn((where: Record<string, unknown>) => Promise.resolve(
                savedMessages.find((message) => message.threadId === where.threadId && message.senderId === where.senderId && message.idempotencyKey === where.idempotencyKey) ?? null,
            )),
            save: vi.fn(async (value: Record<string, unknown>) => {
                messageNumber += 1
                const message = { ...value, id: `message-${messageNumber}`, createdAt: new Date('2026-09-24T12:00:00.000Z') }
                savedMessages.push(message)
                return message
            }),
        }
        const threadRepository = { findOneBy: vi.fn().mockResolvedValue(thread), findOne: vi.fn().mockResolvedValue(thread), save: vi.fn() }
        const blockRepository = { find: vi.fn().mockResolvedValue([]) }
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue({ id: thread.providerId, ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }) }
        const manager = {
            getRepository(entity: unknown) {
                if (entity === AutoCareChatThreadEntity) return threadRepository
                if (entity === AutoCareChatBlockEntity) return blockRepository
                if (entity === ServiceMessageEntity) return messageRepository
                if (entity === ServiceRequestEntity) return { findOne: vi.fn() }
                return {}
            },
        }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutoCareChatThreadEntity) return threadRepository
            if (entity === AutoCareChatBlockEntity) return blockRepository
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === ServiceMessageEntity) return messageRepository
            return {}
        })
        mocks.transaction.mockImplementation(async (operation: (manager: typeof manager) => Promise<unknown>) => operation(manager))

        const first = await createAutoCareChatMessage(client, chatId, { body: '  Привет  ' }, ' retry_123 ')
        const repeated = await createAutoCareChatMessage(client, chatId, { body: 'Привет' }, 'retry_123')
        expect(repeated).toEqual(first)
        expect(messageRepository.save).toHaveBeenCalledTimes(1)
        expect(mocks.broadcastServiceChat).toHaveBeenCalledTimes(1)

        await expect(createAutoCareChatMessage(client, chatId, { body: 'Другой текст' }, 'retry_123')).rejects.toMatchObject({ statusCode: 409 })
        expect(messageRepository.save).toHaveBeenCalledTimes(1)

        const newOperation = await createAutoCareChatMessage(client, chatId, { body: 'Привет' }, 'retry_456')
        expect(newOperation.id).not.toBe(first.id)
        expect(messageRepository.save).toHaveBeenCalledTimes(2)
        expect(mocks.broadcastServiceChat).toHaveBeenCalledTimes(2)
    })
})
