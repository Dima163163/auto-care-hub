import { http, HttpResponse } from "msw"
import { mockUsers } from ".././data"
import { clearMockChatReportAssignment, persistMockChatReportAssignment } from ".././mock-chat-report-assignment"
import { currentMockUser } from './mock-access'
import { mockChatMessages, mockChatThreadFromRequest } from './mock-chat'
import { mockAutoCareChatBlocks, mockAutoCareChatReports, mockAutoCareChatThreads, mockAutoCareServiceRequests } from './mock-fixtures'
import { invalidMockBodyResponse, parseMockOffset } from './mock-validation'

export const chatModerationHandlers = [
{ order: 204, handler: http.get('/api/admin/chat-reports', ({ request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const query = new URL(request.url).searchParams
        const status = query.get('status')
        const scope = query.get('scope')
        const search = (query.get('search') ?? '').normalize('NFKC').trim().toLocaleLowerCase().slice(0, 120)
        const assignedModeratorId = query.get('assignedModeratorId')
        const category = query.get('category')
        const limit = Math.max(1, Math.min(100, Number(query.get('limit')) || 50))
        const offset = parseMockOffset(query.get('cursor'))
        const filtered = mockAutoCareChatReports.filter((report) => {
            if (status && report.status !== status) return false
            if (scope === 'active' && report.status !== 'pending') return false
            if (scope === 'archive' && report.status === 'pending') return false
            if (category && report.category !== category) return false
            if (assignedModeratorId === 'me' && report.assignedModeratorId !== user.id) return false
            if (assignedModeratorId === 'unassigned' && report.assignedModeratorId !== null) return false
            if (assignedModeratorId && assignedModeratorId !== 'me' && assignedModeratorId !== 'unassigned' && report.assignedModeratorId !== assignedModeratorId) return false
            return !search || report.id.toLocaleLowerCase().includes(search) || report.threadId.toLocaleLowerCase().includes(search)
        }).sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
        const items = filtered.slice(offset, offset + limit + 1).slice(0, limit).map((report) => {
            const assignedActive = report.status === 'pending' && report.assignedModeratorId === user.id && Boolean(report.accessExpiresAt && Date.parse(report.accessExpiresAt) > Date.now())
            return user.role === 'super_admin' || assignedActive ? report : { ...report, description: null }
        })
        return HttpResponse.json({ items, nextCursor: offset + limit < filtered.length ? `offset:${offset + limit}` : null, totalCount: filtered.length })
    }) },
{ order: 205, handler: http.patch('/api/admin/chat-reports/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const report = mockAutoCareChatReports.find((candidate) => candidate.id === params.id)
        if (!report) return HttpResponse.json({ message: 'Chat report not found.' }, { status: 404 })
        if (user.role === 'admin' && (report.assignedModeratorId !== user.id || !report.accessExpiresAt || Date.parse(report.accessExpiresAt) <= Date.now() || report.status !== 'pending')) return HttpResponse.json({ message: 'Only the assigned moderator with active access can decide this report.' }, { status: 403 })
        const body = await request.json() as { status?: 'resolved' | 'dismissed'; reason?: string | null; blockUser?: boolean; blockDurationDays?: 1 | 7 | 30 }
        if (!body.status || !['resolved', 'dismissed'].includes(body.status)) return HttpResponse.json({ message: 'Invalid decision.' }, { status: 400 })
        if (typeof body.reason !== 'string' || body.reason.trim().length < 10 || (body.blockUser !== undefined && typeof body.blockUser !== 'boolean')
            || (body.blockUser && body.status !== 'resolved')
            || (body.blockDurationDays !== undefined && ![1, 7, 30].includes(body.blockDurationDays))
            || (body.blockDurationDays !== undefined && !body.blockUser)) return HttpResponse.json({ message: 'Invalid decision.' }, { status: 400 })
        if (body.blockDurationDays === 30 && user.role !== 'super_admin') return HttpResponse.json({ message: 'Only a super administrator can apply a 30-day chat restriction.' }, { status: 403 })
        if (!report.messageId && (user.role !== 'super_admin' || body.reason.trim().length < 10 || body.blockUser)) return HttpResponse.json({ message: 'This unanchored legacy report can only be closed by a SuperAdmin with a reason of at least 10 characters.' }, { status: 400 })
        const now = new Date().toISOString()
        report.status = body.status
        report.reviewedById = user.id
        report.resolutionReason = body.reason.trim()
        report.reviewedAt = now
        clearMockChatReportAssignment(report.id)
        const reviewedThread = [...mockAutoCareChatThreads, ...mockAutoCareServiceRequests.map(mockChatThreadFromRequest)].find((thread) => thread.id === report.threadId)
        if (reviewedThread) {
            const retainUntil = new Date(Date.now() + 90 * 24 * 60 * 60_000).toISOString()
            mockChatMessages(reviewedThread).forEach((message) => {
                if (!message.evidenceRetainUntil || Date.parse(message.evidenceRetainUntil) < Date.parse(retainUntil)) message.evidenceRetainUntil = retainUntil
            })
        }
        if (body.blockUser && report.reportedUserId && report.messageId) {
            const durationDays = body.blockDurationDays ?? 1
            mockAutoCareChatBlocks.unshift({ id: `chat-block-${Date.now()}`, threadId: report.threadId, blockerId: user.id, blockedUserId: report.reportedUserId, status: 'active', reason: body.reason.trim(), sourceReportId: report.id, expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60_000).toISOString(), createdAt: now, revokedAt: null })
        }
        return HttpResponse.json(report)
    }) },
{ order: 206, handler: http.patch('/api/admin/chat-reports/:id/assignment', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'super_admin') return HttpResponse.json({ message: 'Only a super administrator can assign moderators.' }, { status: 403 })
        const report = mockAutoCareChatReports.find((candidate) => candidate.id === params.id)
        if (!report) return HttpResponse.json({ message: 'Chat report not found.' }, { status: 404 })
        if (report.status !== 'pending') return HttpResponse.json({ message: 'Only an active report can be assigned.' }, { status: 409 })
        const targetThread = [...mockAutoCareChatThreads, ...mockAutoCareServiceRequests.map(mockChatThreadFromRequest)].find((thread) => thread.id === report.threadId)
        if (!report.messageId || !targetThread || !mockChatMessages(targetThread).some((message) => message.id === report.messageId)) return HttpResponse.json({ message: 'A report without anchored message evidence cannot be assigned.' }, { status: 409 })
        const body = await request.json() as { moderatorId?: unknown; reason?: unknown }
        if ((body.moderatorId !== null && typeof body.moderatorId !== 'string') || typeof body.reason !== 'string' || body.reason.trim().length < 10) return invalidMockBodyResponse()
        if (typeof body.moderatorId === 'string' && !mockUsers.some((candidate) => candidate.id === body.moderatorId && candidate.role === 'admin' && candidate.status === 'active')) return HttpResponse.json({ message: 'An active administrator moderator is required.' }, { status: 400 })
        report.assignedModeratorId = typeof body.moderatorId === 'string' ? body.moderatorId : null
        report.accessExpiresAt = report.assignedModeratorId ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
        report.extensionUsed = false
        persistMockChatReportAssignment(report)
        return HttpResponse.json(report)
    }) },
{ order: 207, handler: http.post('/api/admin/chat-reports/:id/assignment/extend', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'Only the assigned moderator can extend access.' }, { status: 403 })
        const report = mockAutoCareChatReports.find((candidate) => candidate.id === params.id)
        if (!report || report.status !== 'pending' || report.assignedModeratorId !== user.id || !report.accessExpiresAt || Date.parse(report.accessExpiresAt) <= Date.now()) return HttpResponse.json({ message: 'Active moderator access not found.' }, { status: 403 })
        if (report.extensionUsed) return HttpResponse.json({ message: 'Moderator access has already been extended.' }, { status: 409 })
        const body = await request.json() as { reason?: unknown }
        if (typeof body.reason !== 'string' || body.reason.trim().length < 10) return invalidMockBodyResponse()
        report.accessExpiresAt = new Date(Date.parse(report.accessExpiresAt) + 24 * 60 * 60 * 1000).toISOString()
        report.extensionUsed = true
        persistMockChatReportAssignment(report)
        return HttpResponse.json(report)
    }) }
]
