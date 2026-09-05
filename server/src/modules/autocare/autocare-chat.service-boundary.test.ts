import { describe, expect, it } from 'vitest'

import { AutoCareChatReportCategory } from '../../entities/automotive/chat-moderation.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import {
    createAutoCareChat,
    createAutoCareChatAttachment,
    createAutoCareChatBlock,
    createAutoCareChatMessage,
    createAutoCareChatReport,
    decideAdminAutoCareChatReport,
    getAutoCareChat,
    getAutoCareChatAttachment,
    getAutoCareChatThreadForRequest,
    listAdminAutoCareChatReports,
    markAutoCareChatRead,
    revokeAutoCareChatBlock,
} from './autocare-chat.service.js'

const client = { id: '11111111-1111-4111-8111-111111111111', role: UserRole.Client } as never
const admin = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Admin } as never

describe('AutoCare chat service boundaries', () => {
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
        await expect(createAutoCareChatReport(client, 'not-a-uuid', { category: AutoCareChatReportCategory.Spam })).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareChatBlock(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareChatAttachment(client, 'not-a-uuid', null as never)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('validates attachment and block identifiers before repository access', async () => {
        await expect(getAutoCareChatAttachment(client, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(revokeAutoCareChatBlock(client, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps admin authorization ahead of report list and decision validation', async () => {
        await expect(listAdminAutoCareChatReports(client, 'unknown' as never)).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAdminAutoCareChatReport(client, 'not-a-uuid', 'resolved' as never)).rejects.toMatchObject({ statusCode: 403 })
        await expect(listAdminAutoCareChatReports(admin, 'unknown' as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(decideAdminAutoCareChatReport(admin, 'not-a-uuid', 'resolved' as never)).rejects.toMatchObject({ statusCode: 422 })
    })
})
