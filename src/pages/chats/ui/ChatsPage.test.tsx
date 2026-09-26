import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import type { TranslationKey } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { ChatsPage } from './ChatsPage'

const mocks = vi.hoisted(() => ({
    sendMessage: vi.fn(),
    createReport: vi.fn(),
    deleteMessage: vi.fn(),
    myReports: [] as Array<{ id: string; threadId: string; messageId: string | null; reporterId: string; reportedUserId: string | null; category: 'harassment'; description: string | null; assignedModeratorId: string | null; status: 'pending'; createdAt: string }>,
    getChat: vi.fn(),
    createAttachment: vi.fn(),
    createChat: vi.fn(),
    createAppeal: vi.fn(),
    markRead: vi.fn(),
    refetch: vi.fn(),
    cleanup: vi.fn(),
    connectAutoCareChat: vi.fn(),
    chatIsLoading: false,
    userRole: 'client' as 'client' | 'admin' | 'super_admin',
    userId: 'client-1',
    moderationReports: [] as Array<{ id: string; threadId: string; messageId: string | null; assignedModeratorId: string | null; accessExpiresAt: string | null; status: 'pending' }>,
    chatListIsSuccess: true,
    chatListIsError: false,
    emitPresenceOnConnect: false,
    chatData: {
        thread: { id: 'chat-1', type: 'support', subject: 'Support', providerName: null, clientId: 'client-1' },
        messages: [],
        attachments: [],
        previousCursor: null,
    },
    chats: [{ id: 'chat-1', type: 'support' as 'support' | 'service_request', providerId: null as string | null, requestId: null as string | null, subject: 'Support', unreadCount: 0, updatedAt: '2026-08-30T10:00:00.000Z' }],
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { id: mocks.userId, role: mocks.userRole, email: 'client@example.com' } }),
}))

vi.mock('@/entities/automotive-service', () => ({
    ServiceRequestChat: () => null,
    connectAutoCareChat: mocks.connectAutoCareChat,
    useCreateAutoCareChatMessageMutation: () => [mocks.sendMessage, { isLoading: false }],
    useCreateAutoCareChatAttachmentMutation: () => [mocks.createAttachment, { isLoading: false }],
    useCreateAutoCareChatReportMutation: () => [mocks.createReport, { isLoading: false }],
    useDeleteAutoCareChatMessageMutation: () => [mocks.deleteMessage, { isLoading: false }],
    useCreateAutoCareChatMutation: () => [mocks.createChat, { isLoading: false }],
    useCreateAutoCareAppealMutation: () => [mocks.createAppeal, { isLoading: false }],
    useGetAutoCareChatQuery: (input: unknown, options?: unknown) => {
        mocks.getChat(input, options)
        return {
        data: mocks.chatData,
        isLoading: mocks.chatIsLoading,
        isUninitialized: false,
        isFetching: false,
        refetch: mocks.refetch,
        }
    },
    useGetAutoCareChatsQuery: () => ({
        data: mocks.chats,
        isLoading: false,
        isSuccess: mocks.chatListIsSuccess,
        isError: mocks.chatListIsError,
    }),
    useGetMyAutoCareChatReportsQuery: () => ({ data: { items: mocks.myReports, nextCursor: null }, isLoading: false }),
    useMarkAutoCareChatReadMutation: () => [mocks.markRead],
    useGetAdminAutoCareChatReportsQuery: () => ({ data: { items: mocks.moderationReports, nextCursor: null }, isLoading: false, isError: false, refetch: vi.fn() }),
}))

function renderPage(entry = '/chats') {
    return render(
        <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: (key: TranslationKey) => key }}>
            <MemoryRouter initialEntries={[entry]}>
                <ChatsPage />
            </MemoryRouter>
        </I18nContext.Provider>,
    )
}

describe('ChatsPage', () => {
    beforeEach(() => {
        mocks.chatIsLoading = false
        mocks.chatListIsSuccess = true
        mocks.chatListIsError = false
        mocks.userRole = 'client'
        mocks.userId = 'client-1'
        mocks.moderationReports = []
        mocks.myReports = []
        mocks.chatData = { thread: { id: 'chat-1', type: 'support', subject: 'Support', providerName: null, clientId: 'client-1' }, messages: [], attachments: [], previousCursor: null }
        mocks.chats = [{ id: 'chat-1', type: 'support', providerId: null, requestId: null, subject: 'Support', unreadCount: 0, updatedAt: '2026-08-30T10:00:00.000Z' }]
        mocks.createChat.mockReset()
        mocks.createAppeal.mockReset()
        mocks.markRead.mockReset()
        mocks.emitPresenceOnConnect = false
        mocks.connectAutoCareChat.mockClear()
        mocks.connectAutoCareChat.mockImplementation((_chatId: string, listener: (event: { type: 'presence'; threadId: string; payload: { connected: boolean } }) => void) => {
            if (mocks.emitPresenceOnConnect) listener({ type: 'presence', threadId: 'chat-1', payload: { connected: true } })
            return mocks.cleanup
        })
        mocks.refetch.mockReset()
        mocks.sendMessage.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue(new Error('temporary failure')),
        }))
        mocks.createReport.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        mocks.deleteMessage.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        mocks.getChat.mockReset()
    })

    it('does not connect realtime chat before the conversation query starts', () => {
        mocks.chatIsLoading = true
        mocks.emitPresenceOnConnect = true
        mocks.refetch.mockImplementation(() => {
            throw new Error('Cannot refetch a query that has not been started yet')
        })

        renderPage()

        expect(mocks.connectAutoCareChat).not.toHaveBeenCalled()
        expect(screen.getByRole('status', { name: 'common.loading' })).toBeVisible()
    })

    it('waits for successful chat-list resolution before creating a provider inquiry', async () => {
        const previousChats = mocks.chats
        mocks.chats = []
        mocks.chatListIsSuccess = false
        mocks.chatListIsError = true
        mocks.createChat.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockResolvedValue({ id: 'inquiry-1' }),
        }))
        const view = renderPage('/chats?providerId=provider-1')

        expect(mocks.createChat).not.toHaveBeenCalled()

        mocks.chatListIsSuccess = true
        view.rerender(
            <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: (key: TranslationKey) => key }}>
                <MemoryRouter initialEntries={['/chats?providerId=provider-1']}>
                    <ChatsPage />
                </MemoryRouter>
            </I18nContext.Provider>,
        )

        await waitFor(() => expect(mocks.createChat).toHaveBeenCalledTimes(1))
        mocks.chats = previousChats
        mocks.chatListIsError = false
    })

    it('does not post a duplicate inquiry while chat-list loading is in error', () => {
        const previousChats = mocks.chats
        mocks.chats = []
        mocks.chatListIsSuccess = false
        mocks.chatListIsError = true
        mocks.createChat.mockReset()

        renderPage('/chats?providerId=provider-1')

        expect(mocks.createChat).not.toHaveBeenCalled()
        mocks.chats = previousChats
        mocks.chatListIsError = false
    })

    it('explains that moderators only see assigned complaints and links to the queue', () => {
        mocks.userRole = 'admin'
        mocks.chats = []
        renderPage()

        expect(screen.getByText('autocare.chatWorkspaceModeratorEmptyTitle')).toBeVisible()
        expect(screen.getByText('autocare.chatWorkspaceModeratorEmptyDescription')).toBeVisible()
        expect(screen.getByRole('link', { name: 'autocare.chatWorkspaceModeratorQueue' })).toHaveAttribute('href', '/admin/dashboard#admin-chat-reports')
    })

    it('keeps a failed generic-chat draft and exposes an accessible send error', async () => {
        const user = userEvent.setup()
        renderPage()

        const textbox = screen.getByRole('textbox')
        await user.type(textbox, 'Please help with my car')
        await user.click(screen.getByRole('button', { name: 'autocare.chatSend' }))

        expect(await screen.findByRole('alert')).toHaveTextContent('autocare.chatSendError')
        expect(textbox).toHaveValue('Please help with my car')
        expect(textbox).toHaveAttribute('aria-describedby', 'genericChatActionError')
        expect(textbox).toHaveAttribute('aria-invalid', 'true')
        expect(mocks.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ chatId: 'chat-1', body: 'Please help with my car', idempotencyKey: expect.any(String) }))
    })

    it('lets a participant report an individual generic-chat message after acknowledging full-thread access', async () => {
        const user = userEvent.setup()
        mocks.chatData = {
            ...mocks.chatData,
            messages: [{ id: 'message-reportable', senderId: 'owner-1', kind: 'text', body: 'Synthetic QA message', offer: null, deliveredAt: null, readAt: null, createdAt: new Date().toISOString() }],
        } as never
        renderPage()

        await user.click(await screen.findByRole('button', { name: 'autocare.chatMessageActions' }))
        await user.click(await screen.findByText('autocare.chatReportAction'))
        expect(screen.getByRole('heading', { name: 'autocare.chatReportConfirmTitle' })).toBeVisible()
        expect(screen.getByText('autocare.chatReportConfirmDescription')).toBeVisible()
        await user.click(screen.getByRole('button', { name: 'common.cancel' }))
        expect(mocks.createReport).not.toHaveBeenCalled()

        await user.click(await screen.findByRole('button', { name: 'autocare.chatMessageActions' }))
        await user.click(await screen.findByText('autocare.chatReportAction'))
        await user.selectOptions(screen.getByLabelText('autocare.chatReportCategory'), 'other')
        await user.type(screen.getByLabelText('autocare.chatReportDetails'), 'Synthetic QA rehearsal; this message is not abusive.')
        await user.click(screen.getByRole('button', { name: 'autocare.chatReportConfirmSubmit' }))

        await waitFor(() => expect(mocks.createReport).toHaveBeenCalledWith({
            chatId: 'chat-1',
            messageId: 'message-reportable',
            category: 'other',
            description: 'Synthetic QA rehearsal; this message is not abusive.',
            acknowledgeFullThreadReview: true,
        }))
    })

    it('does not offer a retaliatory generic-chat report during an active moderation review', async () => {
        mocks.chatData = {
            ...mocks.chatData,
            moderationReviewActive: true,
            messagesProtected: true,
            messages: [{ id: 'message-after-report', senderId: 'owner-1', kind: 'text', body: 'Synthetic follow-up', offer: null, deliveredAt: null, readAt: null, createdAt: new Date().toISOString() }],
        } as never
        renderPage()

        expect(await screen.findByRole('status')).toHaveTextContent('autocare.chatReportPendingActionsNotice')
        await userEvent.setup().click(await screen.findByRole('button', { name: 'autocare.chatMessageActions' }))
        expect(screen.queryByText('autocare.chatReportAction')).not.toBeInTheDocument()
    })

    it('hides cached conversation content and skips refetch when moderator access has expired', async () => {
        mocks.userRole = 'admin'
        mocks.userId = 'moderator-1'
        mocks.chats = [{ id: 'chat-1', type: 'service_request', providerId: 'provider-1', requestId: 'request-1', subject: 'Request', unreadCount: 0, updatedAt: '2026-08-30T10:00:00.000Z' }]
        mocks.moderationReports = [{ id: 'report-1', threadId: 'chat-1', messageId: 'message-1', assignedModeratorId: 'moderator-1', accessExpiresAt: new Date(Date.now() - 1).toISOString(), status: 'pending' }]
        mocks.chatData = { ...mocks.chatData, messages: [{ id: 'private-1', body: 'Sensitive chat text' }] } as never

        renderPage('/chats?chat=chat-1&report=report-1')

        expect(await screen.findByRole('alert')).toHaveTextContent('autocare.chatReadAccessExpired')
        expect(screen.queryByText('Sensitive chat text')).not.toBeInTheDocument()
        expect(mocks.getChat).toHaveBeenCalledWith(expect.objectContaining({ chatId: 'chat-1' }), expect.objectContaining({ skip: true }))
        expect(mocks.markRead).not.toHaveBeenCalled()
    })

    it('reuses the same idempotency key when retrying a failed submission', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.type(screen.getByRole('textbox'), 'Retry me')
        await user.click(screen.getByRole('button', { name: 'autocare.chatSend' }))
        await screen.findByRole('alert')
        await user.click(screen.getByRole('button', { name: 'autocare.chatSend' }))

        const firstKey = mocks.sendMessage.mock.calls[0]?.[0].idempotencyKey
        const retryKey = mocks.sendMessage.mock.calls[1]?.[0].idempotencyKey
        expect(firstKey).toEqual(expect.any(String))
        expect(retryKey).toBe(firstKey)
    })

    it('opens a reported service-request thread with scoped chat data in read-only mode for admins', async () => {
        mocks.chats = [{ ...mocks.chats[0]!, id: 'thread-report', type: 'service_request', requestId: 'request-1' }]
        mocks.moderationReports = [{ id: 'report-1', threadId: 'thread-report', messageId: 'message-1', assignedModeratorId: 'client-1', accessExpiresAt: new Date(Date.now() + 60_000).toISOString(), status: 'pending' }]
        render(<I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: (key: TranslationKey) => key }}><MemoryRouter initialEntries={['/chats?chat=thread-report&report=report-1']}><ChatsPage workspace="admin" /></MemoryRouter></I18nContext.Provider>)

        await screen.findByText('autocare.chatModeratorReadOnly')
        expect(mocks.getChat).toHaveBeenCalledWith({ chatId: 'thread-report', beforeCursor: undefined, limit: 50 }, { skip: false, refetchOnMountOrArgChange: true })
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('clears the send error after the user edits the draft', async () => {
        const user = userEvent.setup()
        renderPage()

        const textbox = screen.getByRole('textbox')
        await user.type(textbox, 'Retry this message')
        await user.click(screen.getByRole('button', { name: 'autocare.chatSend' }))
        expect(await screen.findByRole('alert')).toBeVisible()

        await user.type(textbox, '!')

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(textbox).not.toHaveAttribute('aria-invalid', 'true')
    })

    it('lets a restricted participant submit an appeal for the disclosed chat restriction', async () => {
        const user = userEvent.setup()
        const restriction = {
            id: 'restriction-1',
            reason: 'Confirmed policy violation',
            expiresAt: '2026-10-02T10:00:00.000Z',
            state: 'active' as const,
            appealStatus: null,
        }
        mocks.chatData = {
            ...mocks.chatData,
            thread: { ...mocks.chatData.thread, moderationRestriction: restriction } as typeof mocks.chatData.thread,
        }
        mocks.chats = [{ ...mocks.chats[0], moderationRestriction: restriction } as typeof mocks.chats[number]]
        mocks.createAppeal.mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ id: 'appeal-1' }) }))
        renderPage()

        const appealReason = screen.getByRole('textbox', { name: 'autocare.chatRestrictionAppealReason' })
        await user.type(appealReason, 'I believe this restriction was applied in error.')
        await user.click(screen.getByRole('button', { name: 'autocare.chatRestrictionAppealSubmit' }))

        await waitFor(() => expect(mocks.createAppeal).toHaveBeenCalledWith({
            subject: 'chat_restriction',
            subjectId: 'restriction-1',
            reason: 'I believe this restriction was applied in error.',
        }))
    })

    it('exposes a retryable error when creating a support chat fails', async () => {
        const user = userEvent.setup()
        const previousChats = mocks.chats
        mocks.chats = []
        mocks.createChat.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue(new Error('support unavailable')),
        }))
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            renderPage()
            await user.click(screen.getAllByRole('button', { name: 'autocare.chatWorkspaceSupport' })[0]!)

            expect(await screen.findByRole('alert')).toHaveTextContent('support unavailable')
            expect(screen.getByRole('button', { name: 'common.retry' })).toBeVisible()
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
            mocks.chats = previousChats
        }
    })
})
