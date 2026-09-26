import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'

import { handlers } from './handlers'
import { clearMockSession, setMockSession } from './session'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })
afterEach(() => clearMockSession())
afterAll(() => server.close())

async function fetchJson(path: string, init?: RequestInit) {
    return fetch(`http://localhost:3000${path}`, init)
}

describe('mock chat report moderation contract', () => {
    it('filters the admin queue before cursor pagination and returns only the requester history page', async () => {
        setMockSession({ currentUserId: 'user-admin-1', currentRole: 'super_admin' })
        const firstResponse = await fetchJson('/api/admin/chat-reports?scope=active&assignedModeratorId=unassigned&limit=1')
        expect(firstResponse.status).toBe(200)
        const firstPage = await firstResponse.json() as { items: Array<{ id: string; description: string | null }>; nextCursor: string | null; totalCount: number }
        expect(firstPage.totalCount).toBeGreaterThanOrEqual(2)
        expect(firstPage.items).toHaveLength(1)
        expect(firstPage.nextCursor).toBeTruthy()

        const secondResponse = await fetchJson(`/api/admin/chat-reports?scope=active&assignedModeratorId=unassigned&limit=1&cursor=${encodeURIComponent(firstPage.nextCursor!)}`)
        const secondPage = await secondResponse.json() as { items: Array<{ id: string }> }
        expect(secondPage.items).toHaveLength(1)
        expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id)

        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
        const ownResponse = await fetchJson('/api/v1/chats/chat-request-owner-request-1/reports/mine?limit=1')
        expect(ownResponse.status).toBe(200)
        const ownPage = await ownResponse.json() as { items: Array<{ reporterId: string }>; nextCursor: string | null; totalCount: number }
        expect(ownPage.items).toHaveLength(1)
        expect(ownPage.items[0]?.reporterId).toBe('user-client-1')
        expect(ownPage.totalCount).toBeGreaterThanOrEqual(1)
    })

    it('accepts a distinct urgent threat linked to an active case and keeps protected-delete errors opaque', async () => {
        let createdReportId: string | null = null

        try {
            setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
            const newMessageResponse = await fetchJson('/api/v1/service-requests/owner-request-1/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'Idempotency-Key': `moderation-test-${Date.now()}` },
                body: JSON.stringify({ body: 'Новое сообщение сервиса после начала проверки.' }),
            })
            expect(newMessageResponse.status).toBe(201)
            const newMessage = await newMessageResponse.json() as { id: string }

            const unrelatedMessageResponse = await fetchJson('/api/v1/service-requests/owner-request-1/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'Idempotency-Key': `moderation-test-unreported-${Date.now()}` },
                body: JSON.stringify({ body: 'Отдельное QA-сообщение в той же переписке.' }),
            })
            expect(unrelatedMessageResponse.status).toBe(201)
            const unrelatedMessage = await unrelatedMessageResponse.json() as { id: string }

            setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
            const retaliatoryResponse = await fetchJson('/api/v1/chats/chat-request-owner-request-1/reports', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ messageId: newMessage.id, category: 'harassment', acknowledgeFullThreadReview: true }),
            })
            expect(retaliatoryResponse.status).toBe(409)

            const threatResponse = await fetchJson('/api/v1/chats/chat-request-owner-request-1/reports', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    messageId: newMessage.id,
                    category: 'threat',
                    description: 'Угроза срыва ремонта при несогласии с сервисом.',
                    acknowledgeFullThreadReview: true,
                }),
            })
            expect(threatResponse.status).toBe(201)
            const threatReport = await threatResponse.json() as { id: string; relatedReportId: string | null }
            createdReportId = threatReport.id
            expect(threatReport.relatedReportId).toBe('chat-report-demo-1')

            setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
            const conversationResponse = await fetchJson('/api/v1/service-requests/owner-request-1/conversation')
            expect(conversationResponse.status).toBe(200)
            const ownerConversation = await conversationResponse.json() as { moderationReviewActive: boolean; messagesProtected: boolean }
            expect(ownerConversation).toMatchObject({ moderationReviewActive: true, messagesProtected: true })

            setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
            const clientConversationResponse = await fetchJson('/api/v1/service-requests/owner-request-1/conversation')
            const clientConversation = await clientConversationResponse.json() as { moderationReviewActive: boolean; messagesProtected: boolean }
            expect(clientConversation).toMatchObject({ moderationReviewActive: true, messagesProtected: true })

            setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
            const unrelatedDeleteResponse = await fetchJson(`/api/v1/chats/chat-request-owner-request-1/messages/${unrelatedMessage.id}`, { method: 'DELETE' })
            expect(unrelatedDeleteResponse.status).toBe(409)
            const deleteResponse = await fetchJson('/api/v1/chats/chat-request-owner-request-1/messages/mock-message-2', { method: 'DELETE' })
            expect(deleteResponse.status).toBe(409)
            const deleteBody = await deleteResponse.json() as { message: string }
            expect(deleteBody.message).toBe('The message can no longer be deleted.')
            expect(deleteBody.message).not.toMatch(/report|review|case/i)
        } finally {
            if (createdReportId) {
                setMockSession({ currentUserId: 'user-admin-1', currentRole: 'super_admin' })
                await fetchJson(`/api/admin/chat-reports/${encodeURIComponent(createdReportId)}/decision`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ status: 'dismissed', reason: 'Clean up synthetic moderation test.' }),
                })
            }
            clearMockSession()
        }
    })

    it('enforces moderator assignment, temporary sanctions, and restriction appeals', async () => {
        const ids: { reportId?: string; appealId?: string } = {}
        try {
            setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
            const messageResponse = await fetchJson('/api/v1/service-requests/owner-request-2/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'Idempotency-Key': `sanction-test-${Date.now()}` },
                body: JSON.stringify({ body: 'Проверим тормозную систему и согласуем ремонт до начала работ.' }),
            })
            expect(messageResponse.status).toBe(201)
            const message = await messageResponse.json() as { id: string }

            setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
            const reportResponse = await fetchJson('/api/v1/chats/chat-request-owner-request-2/reports', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ messageId: message.id, category: 'harassment', acknowledgeFullThreadReview: true }),
            })
            expect(reportResponse.status).toBe(201)
            const report = await reportResponse.json() as { id: string }
            ids.reportId = report.id

            setMockSession({ currentUserId: 'user-admin-moderator-1', currentRole: 'admin' })
            expect((await fetchJson('/api/v1/chats/chat-request-owner-request-2')).status).toBe(404)

            setMockSession({ currentUserId: 'user-admin-1', currentRole: 'super_admin' })
            const assignmentResponse = await fetchJson(`/api/admin/chat-reports/${report.id}/assignment`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ moderatorId: 'user-admin-moderator-1', reason: 'Назначить для проверки жалобы клиента.' }),
            })
            expect(assignmentResponse.status).toBe(200)

            setMockSession({ currentUserId: 'user-admin-moderator-1', currentRole: 'admin' })
            const assignedChatResponse = await fetchJson('/api/v1/chats/chat-request-owner-request-2')
            expect(assignedChatResponse.status).toBe(200)
            const assignedChat = await assignedChatResponse.json() as { messages: unknown[] }
            expect(assignedChat.messages).toHaveLength(3)
            expect((await fetchJson('/api/v1/chats/chat-request-owner-request-2/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ body: 'Попытка модератора ответить в чате.' }),
            })).status).toBe(403)

            const decisionResponse = await fetchJson(`/api/admin/chat-reports/${report.id}/decision`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ status: 'resolved', reason: 'Решение принято после проверки материалов.', blockUser: true, blockDurationDays: 7 }),
            })
            expect(decisionResponse.status).toBe(200)

            setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
            const blockedThread = await (await fetchJson('/api/v1/service-requests/owner-request-2/chat-thread')).json() as { moderationRestriction?: { id: string; state: string; appealStatus: string | null } }
            expect(blockedThread.moderationRestriction).toMatchObject({ state: 'active', appealStatus: null })
            expect((await fetchJson('/api/v1/service-requests/owner-request-2/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ body: 'Попытка написать при активном ограничении.' }),
            })).status).toBe(403)

            const appealResponse = await fetchJson('/api/v1/autocare-appeals', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ subject: 'chat_restriction', subjectId: blockedThread.moderationRestriction!.id, reason: 'Прошу повторно проверить контекст и переписку целиком.' }),
            })
            expect(appealResponse.status).toBe(201)
            const appeal = await appealResponse.json() as { id: string }
            ids.appealId = appeal.id

            setMockSession({ currentUserId: 'user-admin-1', currentRole: 'super_admin' })
            const appealDecisionResponse = await fetchJson(`/api/admin/autocare-appeals/${appeal.id}/decision`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ status: 'accepted', reason: 'Апелляция подтверждена после повторной проверки.' }),
            })
            expect(appealDecisionResponse.status).toBe(200)

            setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
            const restoredThread = await (await fetchJson('/api/v1/service-requests/owner-request-2/chat-thread')).json() as { moderationRestriction?: unknown }
            expect(restoredThread.moderationRestriction).toBeNull()
            expect((await fetchJson('/api/v1/service-requests/owner-request-2/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'Idempotency-Key': `sanction-lifted-${Date.now()}` },
                body: JSON.stringify({ body: 'Ограничение снято: продолжаем согласование.' }),
            })).status).toBe(201)
        } finally {
            clearMockSession()
        }
    })

    it('serves the synthetic attachment only while a moderator assignment is active', async () => {
        let reportId: string | null = null

        try {
            setMockSession({ currentUserId: 'user-owner-1', currentRole: 'owner' })
            const messageResponse = await fetchJson('/api/v1/service-requests/owner-request-2/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'Idempotency-Key': `attachment-moderation-${Date.now()}` },
                body: JSON.stringify({ body: 'Проверочное сообщение для доступа к синтетическому вложению.' }),
            })
            expect(messageResponse.status).toBe(201)
            const message = await messageResponse.json() as { id: string }

            setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })
            const reportResponse = await fetchJson('/api/v1/chats/chat-request-owner-request-2/reports', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ messageId: message.id, category: 'other', acknowledgeFullThreadReview: true }),
            })
            expect(reportResponse.status).toBe(201)
            const report = await reportResponse.json() as { id: string }
            reportId = report.id

            setMockSession({ currentUserId: 'user-admin-1', currentRole: 'super_admin' })
            const assignmentResponse = await fetchJson(`/api/admin/chat-reports/${report.id}/assignment`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ moderatorId: 'user-admin-moderator-1', reason: 'Проверка приватного QA-вложения.' }),
            })
            expect(assignmentResponse.status).toBe(200)
            const assignment = await assignmentResponse.json() as { accessExpiresAt: string }

            setMockSession({ currentUserId: 'user-admin-moderator-1', currentRole: 'admin' })
            const chatResponse = await fetchJson('/api/v1/chats/chat-request-owner-request-2')
            expect(chatResponse.status).toBe(200)
            const chat = await chatResponse.json() as { attachments: Array<{ id: string; contentType: string; url: string }> }
            const attachment = chat.attachments.find((item) => item.id === 'chat-report-synthetic-attachment-1')
            expect(attachment).toMatchObject({ id: 'chat-report-synthetic-attachment-1', contentType: 'image/png' })
            expect(attachment?.url).toContain('/api/v1/chats/chat-request-owner-request-2/attachments/')

            const activeAttachmentResponse = await fetchJson(attachment!.url)
            expect(activeAttachmentResponse.status).toBe(200)
            expect(activeAttachmentResponse.headers.get('content-type')).toContain('image/png')
            const pngSignature = new Uint8Array(await activeAttachmentResponse.arrayBuffer()).slice(0, 8)
            expect([...pngSignature]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])

            vi.useFakeTimers({ toFake: ['Date'] })
            vi.setSystemTime(Date.parse(assignment.accessExpiresAt) + 1_000)
            const expiredAttachmentResponse = await fetchJson(attachment!.url)
            // Expired assignments hide the moderated thread itself, so the
            // saved attachment URL is deliberately indistinguishable from a
            // missing chat instead of revealing that it still exists.
            expect(expiredAttachmentResponse.status).toBe(404)
        } finally {
            vi.useRealTimers()
            if (reportId) {
                setMockSession({ currentUserId: 'user-admin-1', currentRole: 'super_admin' })
                await fetchJson(`/api/admin/chat-reports/${encodeURIComponent(reportId)}/decision`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ status: 'dismissed', reason: 'Закрытие синтетического теста доступа к вложению.' }),
                })
            }
            clearMockSession()
        }
    })
})
