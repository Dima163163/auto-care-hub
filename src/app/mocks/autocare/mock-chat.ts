import type { User } from "@/entities/user"
import { type ServiceChatMessage } from "@/entities/automotive-service/lib/service-chat"
import { mockAutoCareAttachments, mockAutoCareChatAttachments, mockAutoCareChatBlocks, mockAutoCareChatMessages, mockAutoCareChatReports, mockAutoCareChatThreads, mockAutoCareMessages, mockAutoCareServiceRequests, mockChatReportCategories, ownerAutoCareProviders } from './mock-fixtures'
import type { MockAutoCareChatThread, MockAutoCareServiceRequest, MockNewChatReportCategory } from './mock-fixtures'

export function isMockChatReportCategory(value: unknown): value is MockNewChatReportCategory {
    return typeof value === 'string' && mockChatReportCategories.some((category) => category === value)
}

export function mockChatThreadFromRequest(request: MockAutoCareServiceRequest): MockAutoCareChatThread {
    return { id: `chat-request-${request.id}`, type: 'service_request', status: request.status === 'closed' ? 'closed' : 'open', subject: request.serviceLabels.ru ?? request.serviceSlug, requestId: request.id, providerId: request.providerId, providerName: request.providerName, clientId: request.clientId, createdById: request.clientId, lastMessageAt: request.updatedAt, createdAt: request.createdAt, updatedAt: request.updatedAt }
}

export function getMockAutoCareChatThreads(user: User) {
    const activeModeratedThreadIds = new Set(mockAutoCareChatReports
        .filter((report) => report.messageId !== null && report.status === 'pending' && report.assignedModeratorId === user.id && report.accessExpiresAt !== null && Date.parse(report.accessExpiresAt) > Date.now())
        .map((report) => report.threadId))
    const requestThreads = mockAutoCareServiceRequests
        .filter((request) => user.role === 'super_admin' || request.clientId === user.id || (user.role === 'owner' && ownerAutoCareProviders.some((provider) => provider.id === request.providerId)) || (user.role === 'admin' && activeModeratedThreadIds.has(`chat-request-${request.id}`)))
        .map(mockChatThreadFromRequest)
    const genericThreads = mockAutoCareChatThreads.filter((thread) => user.role === 'super_admin' || ((user.role === 'admin') && (['support', 'admin_escalation'].includes(thread.type) || activeModeratedThreadIds.has(thread.id))) || thread.clientId === user.id || thread.createdById === user.id || (user.role === 'owner' && thread.providerId !== null && ownerAutoCareProviders.some((provider) => provider.id === thread.providerId)))
    return [...requestThreads, ...genericThreads].sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? ''))
}

export function getMockChatReportAccess(user: User, threadId: string) {
    const reports = mockAutoCareChatReports.filter((report) => report.threadId === threadId && report.messageId !== null && report.status === 'pending')
    if (user.role === 'super_admin') return { allowed: true, reports }
    const assigned = reports.filter((report) => report.assignedModeratorId === user.id && report.accessExpiresAt !== null && Date.parse(report.accessExpiresAt) > Date.now())
    return { allowed: user.role === 'admin' && assigned.length > 0, reports: assigned }
}

export function isMockChatMessagingBlocked(threadId: string, userId: string) {
    const now = Date.now()
    return mockAutoCareChatBlocks.some((block) => block.threadId === threadId
        && block.status === 'active'
        && (block.blockerId === userId || block.blockedUserId === userId)
        && (!block.expiresAt || Date.parse(block.expiresAt) > now))
}

export function mockChatMessages(thread: MockAutoCareChatThread) {
    return thread.requestId ? (mockAutoCareMessages.get(thread.requestId) ?? []) : (mockAutoCareChatMessages.get(thread.id) ?? [])
}

export function mockChatAttachments(thread: MockAutoCareChatThread) {
    return thread.requestId ? (mockAutoCareAttachments.get(thread.requestId) ?? []) : (mockAutoCareChatAttachments.get(thread.id) ?? [])
}

export function encodeMockChatCursor(message: ServiceChatMessage) {
    return btoa(JSON.stringify({ createdAt: message.createdAt, id: message.id })).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function decodeMockChatCursor(cursor: string | null) {
    if (!cursor) return null
    try {
        const normalized = cursor.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - cursor.length % 4) % 4)
        const value = JSON.parse(atob(normalized)) as { id?: string }
        return value.id ?? null
    } catch {
        return null
    }
}
