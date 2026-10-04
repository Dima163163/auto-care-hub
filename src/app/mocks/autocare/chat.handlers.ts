import { http, HttpResponse } from "msw"
import { emitMockAutoCareChatEvent, type ServiceChatMessage } from "@/entities/automotive-service/lib/service-chat"
import { mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser } from './mock-access'
import { decodeMockChatCursor, encodeMockChatCursor, getMockAutoCareChatThreads, getMockChatReportAccess, isMockChatMessagingBlocked, isMockChatReportCategory, mockChatAttachments, mockChatMessages, mockChatThreadFromRequest } from './mock-chat'
import { autoCareProviders, mockAutoCareChatAttachments, mockAutoCareChatBlocks, mockAutoCareChatMessages, mockAutoCareChatReports, mockAutoCareChatThreads, mockAutoCareServiceRequests, ownerAutoCareProviders } from './mock-fixtures'
import type { MockAutoCareChatBlock, MockAutoCareChatReport, MockAutoCareChatThread } from './mock-fixtures'
import { getMockModerationRestriction, parseMockOffset } from './mock-validation'

export const chatHandlers = [
{ order: 99, handler: http.get('/api/v1/service-requests/:requestId/chat-thread', ({ params }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const request = mockAutoCareServiceRequests.find((item) => item.id === params.requestId)
        if (!request) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        const thread = mockChatThreadFromRequest(request)
        const isParticipant = request.clientId === user.id || (user.role === 'owner' && ownerAutoCareProviders.some((provider) => provider.id === request.providerId))
        if (!isParticipant && !getMockChatReportAccess(user, thread.id).allowed && user.role !== 'super_admin') return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        return HttpResponse.json({ ...thread, unreadCount: 0, moderationRestriction: getMockModerationRestriction(thread, user) })
    }) },
{ order: 100, handler: http.get('/api/v1/chats', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const threads = getMockAutoCareChatThreads(user).map((thread) => ({ ...thread, unreadCount: mockChatMessages(thread).filter((message) => message.senderId !== user.id && !message.readAt).length, moderationRestriction: getMockModerationRestriction(thread, user) }))
        return HttpResponse.json(threads)
    }) },
{ order: 101, handler: http.post('/api/v1/chats', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as { type?: MockAutoCareChatThread['type']; providerId?: string; subject?: string }
        if (!body.type || body.type === 'service_request' || !body.subject?.trim()) return HttpResponse.json({ message: 'Invalid chat.' }, { status: 400 })
        if (body.type === 'provider_inquiry' && user.role !== 'client') return HttpResponse.json({ message: 'Only clients can ask a service a question.' }, { status: 403 })
        if (body.type === 'support' && !['client', 'owner'].includes(user.role)) return HttpResponse.json({ message: 'Only clients and service owners can open support.' }, { status: 403 })
        if (body.type === 'support' && body.providerId && user.role !== 'owner') return HttpResponse.json({ message: 'Only service owners can link support to a service.' }, { status: 403 })
        if (body.type === 'admin_escalation' && !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Only administrators can escalate.' }, { status: 403 })
        const provider = body.providerId ? autoCareProviders.find((candidate) => candidate.id === body.providerId) : undefined
        if (body.type === 'provider_inquiry' && provider?.chatEnabled === false) return HttpResponse.json({ message: 'This service currently accepts questions by phone or request form, not in chat.' }, { status: 409 })
        const clientId = user.role === 'client' ? user.id : null
        const existing = body.type === 'support'
            ? mockAutoCareChatThreads.find((thread) => thread.type === 'support' && thread.status === 'open' && thread.createdById === user.id && thread.providerId === (body.providerId ?? null) && thread.clientId === clientId)
            : undefined
        if (existing) return HttpResponse.json({ ...existing, unreadCount: mockChatMessages(existing).filter((message) => message.senderId !== user.id && !message.readAt).length }, { status: 201 })
        const now = new Date().toISOString()
        const thread: MockAutoCareChatThread = { id: `chat-${Date.now()}`, type: body.type, status: 'open', subject: body.subject.trim(), requestId: null, providerId: body.providerId ?? null, providerName: provider?.name ?? null, clientId, createdById: user.id, lastMessageAt: null, createdAt: now, updatedAt: now }
        mockAutoCareChatThreads.unshift(thread)
        mockAutoCareChatMessages.set(thread.id, [])
        mockAutoCareChatAttachments.set(thread.id, [])
        return HttpResponse.json({ ...thread, unreadCount: 0 }, { status: 201 })
    }) },
{ order: 102, handler: http.post('/api/v1/chats/:chatId/reports', async ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client' && user.role !== 'owner') return HttpResponse.json({ message: 'Only chat participants can submit reports.' }, { status: 403 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const body = await request.json() as { messageId?: unknown; category?: unknown; description?: unknown; acknowledgeFullThreadReview?: unknown }
        if (typeof body.messageId !== 'string' || !isMockChatReportCategory(body.category) || body.acknowledgeFullThreadReview !== true || (body.description !== undefined && body.description !== null && typeof body.description !== 'string')) return HttpResponse.json({ message: 'Invalid report.' }, { status: 400 })
        const message = mockChatMessages(thread).find((candidate) => candidate.id === body.messageId)
        if (!message || message.senderId === user.id || message.deletedAt) return HttpResponse.json({ message: 'The selected message cannot be reported.' }, { status: 409 })
        const existing = mockAutoCareChatReports.find((report) => report.threadId === thread.id && report.reporterId === user.id && report.messageId === message.id && report.status === 'pending')
        if (existing) return HttpResponse.json(existing, { status: 409 })
        const activeReports = mockAutoCareChatReports.filter((report) => report.threadId === thread.id && report.messageId !== null && report.status === 'pending')
        const firstActiveAt = activeReports.map((report) => Date.parse(report.createdAt)).sort((a, b) => a - b)[0]
        const isPriorIncident = Number.isFinite(firstActiveAt) && Date.parse(message.createdAt) <= firstActiveAt
        const relatedReport = activeReports[0]
        const description = typeof body.description === 'string' ? body.description.trim() : ''
        const urgentLinkedThreat = Boolean(relatedReport && !isPriorIncident && body.category === 'threat')
        if (relatedReport && !isPriorIncident && !urgentLinkedThreat) return HttpResponse.json({ message: 'A new report can only be filed for a prior incident during an active review.' }, { status: 409 })
        if (urgentLinkedThreat && description.length < 20) return HttpResponse.json({ message: 'An urgent threat report needs at least 20 characters of context.' }, { status: 400 })
        const reportedUserId = message.senderId
        const now = new Date().toISOString()
        const report: MockAutoCareChatReport = { id: `chat-report-${Date.now()}`, threadId: thread.id, messageId: message.id, reporterId: user.id, reportedUserId, category: body.category, description: description || null, acknowledgeFullThreadReview: true, acknowledgedAt: now, policyVersion: 'chat-report-full-thread-v1', relatedReportId: urgentLinkedThreat ? relatedReport?.id ?? null : null, assignedModeratorId: null, accessExpiresAt: null, extensionUsed: false, status: 'pending', reviewedById: null, resolutionReason: null, createdAt: now, reviewedAt: null }
        mockAutoCareChatReports.unshift(report)
        return HttpResponse.json(report, { status: 201 })
    }) },
{ order: 103, handler: http.get('/api/v1/chats/:chatId/reports/mine', ({ params, request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const thread = getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId)
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const query = new URL(request.url).searchParams
        const limit = Math.max(1, Math.min(100, Number(query.get('limit')) || 50))
        const offset = parseMockOffset(query.get('cursor'))
        const items = mockAutoCareChatReports
            .filter((report) => report.threadId === params.chatId && report.reporterId === user.id)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
        const page = items.slice(offset, offset + limit + 1)
        const hasMore = page.length > limit
        return HttpResponse.json({ items: page.slice(0, limit), nextCursor: hasMore ? `offset:${offset + limit}` : null, totalCount: items.length })
    }) },
{ order: 104, handler: http.delete('/api/v1/chats/:chatId/messages/:messageId', ({ params }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread || user.role === 'admin' || user.role === 'super_admin') return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const message = mockChatMessages(thread).find((candidate) => candidate.id === params.messageId)
        if (!message || message.senderId !== user.id || message.deletedAt) return HttpResponse.json({ message: 'Message not found.' }, { status: 404 })
        // Keep the protected reason opaque to both participants. Server-side
        // policy still blocks deletion, but the response must not reveal that
        // this message is evidence in a moderation case.
        const activeReview = mockAutoCareChatReports.some((report) => report.threadId === thread.id && report.messageId !== null && report.status === 'pending')
        const evidenceRetained = message.evidenceRetainUntil !== null && message.evidenceRetainUntil !== undefined && Date.parse(message.evidenceRetainUntil) > Date.now()
        if (activeReview || evidenceRetained) return HttpResponse.json({ message: 'The message can no longer be deleted.' }, { status: 409 })
        if (Date.now() - Date.parse(message.createdAt) > 5 * 60 * 1000) return HttpResponse.json({ message: 'The message can no longer be deleted for everyone.' }, { status: 409 })
        const deletedAt = new Date().toISOString()
        message.body = ''
        message.deletedAt = deletedAt
        return HttpResponse.json({ id: message.id, deletedAt })
    }) },
{ order: 105, handler: http.post('/api/v1/chats/:chatId/blocks', async ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const body = await request.json() as { blockedUserId?: string; reason?: string | null }
        const blockedUserId = body.blockedUserId ?? (thread.clientId === user.id ? 'user-owner-1' : thread.clientId)
        if (!blockedUserId || blockedUserId === user.id) return HttpResponse.json({ message: 'Another participant is required.' }, { status: 400 })
        const now = new Date().toISOString()
        const existing = mockAutoCareChatBlocks.find((block) => block.threadId === thread.id && block.blockerId === user.id && block.blockedUserId === blockedUserId)
        const block: MockAutoCareChatBlock = existing
            ? Object.assign(existing, { status: 'active' as const, reason: body.reason?.trim() || existing.reason, revokedAt: null, sourceReportId: null, expiresAt: null })
            : { id: `chat-block-${Date.now()}`, threadId: thread.id, blockerId: user.id, blockedUserId, status: 'active', reason: body.reason?.trim() || null, sourceReportId: null, expiresAt: null, createdAt: now, revokedAt: null }
        if (!existing) mockAutoCareChatBlocks.unshift(block)
        return HttpResponse.json(block, { status: 201 })
    }) },
{ order: 106, handler: http.delete('/api/v1/chats/:chatId/blocks/:blockId', ({ params }) => {
        const user = currentMockUser()
        const block = mockAutoCareChatBlocks.find((candidate) => candidate.id === params.blockId && candidate.threadId === params.chatId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!block) return HttpResponse.json({ message: 'Chat block not found.' }, { status: 404 })
        if (block.blockerId !== user.id && !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        block.status = 'revoked'
        block.revokedAt = new Date().toISOString()
        return HttpResponse.json(block)
    }) },
{ order: 107, handler: http.get('/api/v1/chats/:chatId', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const access = getMockChatReportAccess(user, thread.id)
        if (user.role === 'admin' && !access.allowed) return HttpResponse.json({ message: 'An active moderator assignment is required.' }, { status: 403 })
        const url = new URL(request.url)
        const emergencyReason = url.searchParams.get('emergencyReason')?.trim() ?? ''
        if (user.role === 'super_admin' && emergencyReason.length < 10) return HttpResponse.json({ message: 'A documented emergency reason is required to read chat content.' }, { status: 403 })
        const allMessages = mockChatMessages(thread)
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50) || 50, 1), 100)
        const cursorId = decodeMockChatCursor(url.searchParams.get('cursor'))
        const beforeCursorId = decodeMockChatCursor(url.searchParams.get('beforeCursor'))
        const cursorIndex = cursorId ? allMessages.findIndex((message) => message.id === cursorId) : -1
        const beforeCursorIndex = beforeCursorId ? allMessages.findIndex((message) => message.id === beforeCursorId) : -1
        const isLatestPage = !cursorId && !beforeCursorId
        const end = beforeCursorIndex >= 0
            ? beforeCursorIndex
            : cursorIndex >= 0
                ? allMessages.length
                : allMessages.length
        const start = beforeCursorIndex >= 0
            ? Math.max(0, end - limit)
            : cursorIndex >= 0
                ? cursorIndex + 1
                : Math.max(0, allMessages.length - limit)
        const pageEnd = beforeCursorIndex >= 0 || isLatestPage ? end : Math.min(allMessages.length, start + limit)
        const messages = allMessages.slice(start, pageEnd)
        const hasOlder = start > 0
        const hasNewer = pageEnd < allMessages.length
        const now = new Date().toISOString()
        if (user.role !== 'admin' && user.role !== 'super_admin') messages.filter((message) => message.senderId !== user.id && !message.readAt).forEach((message) => { message.readAt = now })
        const attachments = mockChatAttachments(thread).map(({ contentBase64: _contentBase64, ...attachment }) => attachment)
        const moderationReviewActive = mockAutoCareChatReports.some((report) => report.threadId === thread.id && report.messageId !== null && report.status === 'pending')
        const messagesProtected = moderationReviewActive || allMessages.some((message) => message.evidenceRetainUntil && Date.parse(message.evidenceRetainUntil) > Date.now())
        return HttpResponse.json({
            thread: { ...thread, unreadCount: 0, moderationRestriction: getMockModerationRestriction(thread, user) },
            messages,
            attachments,
            nextCursor: hasNewer && messages.at(-1) ? encodeMockChatCursor(messages.at(-1)!) : null,
            previousCursor: hasOlder && messages.at(0) ? encodeMockChatCursor(messages.at(0)!) : null,
            moderationReviewActive,
            messagesProtected,
        })
    }) },
{ order: 108, handler: http.post('/api/v1/chats/:chatId/messages', async ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        if (user.role === 'admin' || user.role === 'super_admin') return HttpResponse.json({ message: 'Moderation access is read-only.' }, { status: 403 })
        const blocked = isMockChatMessagingBlocked(thread.id, user.id)
        if (blocked) return HttpResponse.json({ message: 'Messaging is unavailable because this chat is blocked.' }, { status: 403 })
        const body = await request.json() as { body?: string }
        if (!body.body?.trim()) return HttpResponse.json({ message: 'Message is required.' }, { status: 400 })
        const now = new Date().toISOString()
        const message: ServiceChatMessage = { id: `chat-message-${Date.now()}`, senderId: user.id, kind: 'text', body: body.body.trim(), offer: null, deliveredAt: now, readAt: null, createdAt: now }
        const messages = mockChatMessages(thread)
        messages.push(message)
        thread.lastMessageAt = now
        thread.updatedAt = now
        emitMockAutoCareChatEvent({ type: 'message.created', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: message })
        return HttpResponse.json(message, { status: 201 })
    }) },
{ order: 109, handler: http.post('/api/v1/chats/:chatId/read', ({ params }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user || !thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        if (user.role === 'admin' || user.role === 'super_admin') return HttpResponse.json({ message: 'Moderator reads do not create participant read receipts.' }, { status: 403 })
        const now = new Date().toISOString()
        const messages = mockChatMessages(thread)
        const unread = messages.filter((message) => message.senderId !== user.id && !message.readAt)
        unread.forEach((message) => { message.readAt = now })
        if (unread.length) emitMockAutoCareChatEvent({ type: 'message.read', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: { messageIds: unread.map((message) => message.id), readAt: now } })
        return HttpResponse.json({ updated: unread.length })
    }) },
{ order: 110, handler: http.post('/api/v1/chats/:chatId/attachments', async ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        if (user.role === 'admin' || user.role === 'super_admin') return HttpResponse.json({ message: 'Moderation access is read-only.' }, { status: 403 })
        const body = await request.json() as { fileName?: string; contentType?: string; size?: number; contentBase64?: string }
        if (!body.fileName || !body.contentType || !body.size || !body.contentBase64 || !['image/jpeg', 'image/png', 'image/webp'].includes(body.contentType)) return HttpResponse.json({ message: 'Invalid attachment.' }, { status: 400 })
        const now = new Date().toISOString()
        const attachment = { id: `chat-attachment-${Date.now()}`, uploadedById: user.id, contentType: body.contentType, bytes: body.size, status: 'ready' as const, url: `data:${body.contentType};base64,${body.contentBase64}`, createdAt: now, contentBase64: body.contentBase64 }
        const attachments = mockChatAttachments(thread)
        attachments.push(attachment)
        mockAutoCareChatAttachments.set(thread.id, attachments)
        thread.updatedAt = now
        thread.lastMessageAt = now
        emitMockAutoCareChatEvent({ type: 'attachment.created', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: attachment })
        const { contentBase64: _contentBase64, ...response } = attachment
        return HttpResponse.json(response, { status: 201 })
    }) },
{ order: 111, handler: http.get('/api/v1/chats/:chatId/attachments/:attachmentId', ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user || !thread) return HttpResponse.json({ message: 'Attachment not found.' }, { status: 404 })
        const access = getMockChatReportAccess(user, thread.id)
        if (user.role === 'admin' && !access.allowed) return HttpResponse.json({ message: 'An active moderator assignment is required.' }, { status: 403 })
        if (user.role === 'super_admin' && (new URL(request.url).searchParams.get('emergencyReason')?.trim().length ?? 0) < 10) return HttpResponse.json({ message: 'A documented emergency reason is required to read chat attachments.' }, { status: 403 })
        const attachment = mockChatAttachments(thread).find((candidate) => candidate.id === params.attachmentId)
        if (!attachment) return HttpResponse.json({ message: 'Attachment not found.' }, { status: 404 })
        const [, encoded] = attachment.contentBase64.split(',', 2)
        const body = encoded ?? attachment.contentBase64
        const bytes = Uint8Array.from(atob(body), (character) => character.charCodeAt(0))
        return new HttpResponse(bytes, { headers: { 'Content-Type': attachment.contentType, 'Cache-Control': 'private, no-store' } })
    }) }
]
