import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatReportCategory, AutoCareChatReportEntity, AutoCareChatReportStatus, AutoCareChatThreadEntity, AutoCareChatThreadType, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, ServiceMessageEntity, ServiceMessageKind, ServiceRequestEntity, ServiceRequestStatus } from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { assertThreadAccess, getAutoCareChatAccessContext } from './chat-access.service.js'
import { assignAdminAutoCareChatModerator, extendAdminAutoCareChatModeratorAccess } from './chat-moderator-assignment.service.js'
import { decideAdminAutoCareChatReport, listAdminAutoCareChatReports } from './chat-report.service.js'

describe('chat report conflict on PostgreSQL', () => {
    const suffix = Date.now()
    let client: UserEntity
    let admin: UserEntity
    let independentAdmin: UserEntity
    let independentSuperAdmin: UserEntity
    let superAdmin: UserEntity
    let serviceRequest: ServiceRequestEntity
    let thread: AutoCareChatThreadEntity
    let message: ServiceMessageEntity
    let targetReport: AutoCareChatReportEntity
    let neighboringReport: AutoCareChatReportEntity

    async function changeReport(id: string, changes: Partial<AutoCareChatReportEntity>) {
        const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
        const report = await reports.findOneByOrFail({ id })
        Object.assign(report, changes)
        await reports.save(report)
    }

    beforeAll(async () => {
        const users = AppDataSource.getRepository(UserEntity)
        ;[client, admin, independentAdmin, independentSuperAdmin, superAdmin] = await users.save([
            users.create({ name: 'Report client', email: `report-client-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Client, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Report admin', email: `report-admin-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Admin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Independent admin', email: `report-independent-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Admin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Independent super-admin', email: `report-independent-super-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.SuperAdmin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Report super-admin', email: `report-super-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.SuperAdmin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
        ])
        const location = (await AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ take: 1 }))[0]
        const definition = (await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ take: 1 }))[0]
        if (!location || !definition) throw new Error('The integration catalog seed is required for this fixture.')
        const requests = AppDataSource.getRepository(ServiceRequestEntity)
        serviceRequest = await requests.save(requests.create({
            clientId: client.id,
            providerId: location.providerId,
            locationId: location.id,
            definitionId: definition.id,
            status: ServiceRequestStatus.Draft,
        }))
        const threads = AppDataSource.getRepository(AutoCareChatThreadEntity)
        thread = await threads.save(threads.create({
            type: AutoCareChatThreadType.ServiceRequest,
            requestId: serviceRequest.id,
            providerId: location.providerId,
            clientId: client.id,
            createdById: client.id,
            subject: 'Private report conflict fixture',
        }))
        const messages = AppDataSource.getRepository(ServiceMessageEntity)
        message = await messages.save(messages.create({
            requestId: serviceRequest.id,
            threadId: thread.id,
            senderId: admin.id,
            kind: ServiceMessageKind.Text,
            body: 'Reported message sent before role promotion',
        }))
        const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
        targetReport = await reports.save(reports.create({
            threadId: thread.id,
            reportedMessageId: message.id,
            reporterId: client.id,
            reportedUserId: admin.id,
            category: AutoCareChatReportCategory.Other,
            description: 'Target report private description',
            status: AutoCareChatReportStatus.Pending,
            acknowledgedAt: new Date(),
            policyVersion: 'v1',
            assignedModeratorId: admin.id,
            assignedById: superAdmin.id,
            assignmentReason: 'Historical assignment before role change',
            assignedAt: new Date(),
            accessExpiresAt: new Date(Date.now() + 300_000),
        }))
        neighboringReport = await reports.save(reports.create({
            threadId: thread.id,
            reporterId: superAdmin.id,
            reportedUserId: client.id,
            category: AutoCareChatReportCategory.Other,
            description: 'Neighbor report private description',
            status: AutoCareChatReportStatus.Pending,
        }))
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        if (thread) await AppDataSource.getRepository(AutoCareChatReportEntity).delete({ threadId: thread.id })
        if (message) await AppDataSource.getRepository(ServiceMessageEntity).delete({ id: message.id })
        if (thread) await AppDataSource.getRepository(AutoCareChatThreadEntity).delete({ id: thread.id })
        if (serviceRequest) await AppDataSource.getRepository(ServiceRequestEntity).delete({ id: serviceRequest.id })
        const ids = [client?.id, admin?.id, independentAdmin?.id, independentSuperAdmin?.id, superAdmin?.id].filter((id): id is string => Boolean(id))
        if (ids.length) await AppDataSource.getRepository(UserEntity).delete(ids)
    })

    it('excludes conflicted thread reports from the ordinary admin list', async () => {
        const page = await listAdminAutoCareChatReports(admin, { status: AutoCareChatReportStatus.Pending })
        expect(page.items.some((item) => item.threadId === thread.id)).toBe(false)
    })

    it('prevents a super-admin party from deciding a neighboring pending case', async () => {
        await expect(decideAdminAutoCareChatReport(superAdmin, targetReport.id, AutoCareChatReportStatus.Dismissed, 'Independent reviewer required'))
            .rejects.toMatchObject({ statusCode: 403 })
        expect(await AppDataSource.getRepository(AutoCareChatReportEntity).findOneByOrFail({ id: targetReport.id }))
            .toMatchObject({ status: AutoCareChatReportStatus.Pending, reviewedById: null })
    })

    it('excludes a super-admin party thread from the privileged report list', async () => {
        const page = await listAdminAutoCareChatReports(superAdmin, { status: AutoCareChatReportStatus.Pending })
        expect(page.items.some((item) => item.threadId === thread.id)).toBe(false)
    })

    it('denies the report party private thread access despite a live assignment', async () => {
        await expect(assertThreadAccess(admin, thread)).rejects.toMatchObject({ statusCode: 403 })
        await expect(getAutoCareChatAccessContext(admin, thread.id)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('denies assignment and access extension to the report party', async () => {
        await expect(assignAdminAutoCareChatModerator(superAdmin, targetReport.id, admin.id, 'Review the report independently'))
            .rejects.toMatchObject({ statusCode: 403 })
        await expect(extendAdminAutoCareChatModeratorAccess(admin, targetReport.id, 'Extend this assigned review'))
            .rejects.toMatchObject({ statusCode: 403 })
        expect(await AppDataSource.getRepository(AutoCareChatReportEntity).findOneByOrFail({ id: targetReport.id }))
            .toMatchObject({ status: AutoCareChatReportStatus.Pending, assignedModeratorId: admin.id, extensionUsed: false })
    })

    it('still grants the independent assigned moderator scoped access', async () => {
        const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
        await reports.update({ id: targetReport.id }, { assignedModeratorId: independentAdmin.id })
        try {
            await expect(assertThreadAccess(independentAdmin, thread)).resolves.toBe('pending_report_moderation')
        } finally {
            await reports.update({ id: targetReport.id }, { assignedModeratorId: admin.id })
        }
    })

    it('keeps a closed report party out of a later pending case in the same thread', async () => {
        await changeReport(targetReport.id, { status: AutoCareChatReportStatus.Resolved })
        try {
            await changeReport(neighboringReport.id, {
                reportedMessageId: message.id,
                acknowledgedAt: new Date(),
                policyVersion: 'v1',
                assignedModeratorId: admin.id,
                assignedById: superAdmin.id,
                assignmentReason: 'Historical assignment before conflict check',
                assignedAt: new Date(),
                accessExpiresAt: new Date(Date.now() + 300_000),
            })
            const page = await listAdminAutoCareChatReports(admin, { status: AutoCareChatReportStatus.Pending })
            expect(page.items.some((item) => item.threadId === thread.id)).toBe(false)
            await expect(assertThreadAccess(admin, thread)).rejects.toMatchObject({ statusCode: 403 })
            await expect(assignAdminAutoCareChatModerator(independentSuperAdmin, neighboringReport.id, admin.id, 'Assign independent reviewer'))
                .rejects.toMatchObject({ statusCode: 403 })
            await expect(extendAdminAutoCareChatModeratorAccess(admin, neighboringReport.id, 'Extend current review access'))
                .rejects.toMatchObject({ statusCode: 403 })
            await expect(decideAdminAutoCareChatReport(admin, neighboringReport.id, AutoCareChatReportStatus.Dismissed, 'Independent reviewer required'))
                .rejects.toMatchObject({ statusCode: 403 })
        } finally {
            await changeReport(neighboringReport.id, {
                reportedMessageId: null, acknowledgedAt: null, policyVersion: null,
                assignedModeratorId: null, assignedById: null, assignmentReason: null,
                assignedAt: null, accessExpiresAt: null,
            })
            await changeReport(targetReport.id, { status: AutoCareChatReportStatus.Pending })
        }
    })

    it('denies a super-admin party assignment and decision after their own report closes', async () => {
        const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
        await changeReport(neighboringReport.id, { status: AutoCareChatReportStatus.Dismissed })
        try {
            await expect(assignAdminAutoCareChatModerator(superAdmin, targetReport.id, independentAdmin.id, 'Assign an independent moderator'))
                .rejects.toMatchObject({ statusCode: 403 })
            await expect(decideAdminAutoCareChatReport(superAdmin, targetReport.id, AutoCareChatReportStatus.Dismissed, 'Independent reviewer required'))
                .rejects.toMatchObject({ statusCode: 403 })
            expect(await reports.findOneByOrFail({ id: targetReport.id })).toMatchObject({ status: AutoCareChatReportStatus.Pending })
        } finally {
            await changeReport(neighboringReport.id, { status: AutoCareChatReportStatus.Pending })
        }
    })
})
