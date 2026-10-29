import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatReportCategory, AutoCareChatReportEntity, AutoCareChatReportStatus, AutoCareChatThreadEntity, AutoCareChatThreadType } from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { decideAdminAutoCareChatReport, listAdminAutoCareChatReports } from './chat-report.service.js'

describe('chat report conflict on PostgreSQL', () => {
    const suffix = Date.now()
    let client: UserEntity
    let admin: UserEntity
    let superAdmin: UserEntity
    let thread: AutoCareChatThreadEntity
    let targetReport: AutoCareChatReportEntity
    let neighboringReport: AutoCareChatReportEntity

    beforeAll(async () => {
        const users = AppDataSource.getRepository(UserEntity)
        ;[client, admin, superAdmin] = await users.save([
            users.create({ name: 'Report client', email: `report-client-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Client, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Report admin', email: `report-admin-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Admin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Report super-admin', email: `report-super-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.SuperAdmin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
        ])
        const threads = AppDataSource.getRepository(AutoCareChatThreadEntity)
        thread = await threads.save(threads.create({
            type: AutoCareChatThreadType.ServiceRequest,
            requestId: null,
            providerId: null,
            clientId: client.id,
            createdById: client.id,
            subject: 'Private report conflict fixture',
        }))
        const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
        targetReport = await reports.save(reports.create({
            threadId: thread.id,
            reporterId: client.id,
            reportedUserId: admin.id,
            category: AutoCareChatReportCategory.Other,
            description: 'Target report private description',
            status: AutoCareChatReportStatus.Pending,
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
        if (thread) await AppDataSource.getRepository(AutoCareChatThreadEntity).delete({ id: thread.id })
        const ids = [client?.id, admin?.id, superAdmin?.id].filter((id): id is string => Boolean(id))
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

    it('keeps private details of the super-admin party report redacted in the list', async () => {
        const page = await listAdminAutoCareChatReports(superAdmin, { status: AutoCareChatReportStatus.Pending })
        expect(page.items.find((item) => item.id === neighboringReport.id)?.description).toBeNull()
    })
})
