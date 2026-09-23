import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import type { TranslationKey } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { ChatsPage } from './ChatsPage'

const mocks = vi.hoisted(() => ({
    sendMessage: vi.fn(),
    createAttachment: vi.fn(),
    createChat: vi.fn(),
    markRead: vi.fn(),
    refetch: vi.fn(),
    cleanup: vi.fn(),
    connectAutoCareChat: vi.fn(),
    chatIsLoading: false,
    chatListIsSuccess: true,
    chatListIsError: false,
    emitPresenceOnConnect: false,
    chatData: {
        thread: { id: 'chat-1', type: 'support', subject: 'Support', providerName: null, clientId: 'client-1' },
        messages: [],
        attachments: [],
        previousCursor: null,
    },
    chats: [{ id: 'chat-1', type: 'support', providerId: null, requestId: null, subject: 'Support', unreadCount: 0, updatedAt: '2026-08-30T10:00:00.000Z' }],
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { id: 'client-1', role: 'client', email: 'client@example.com' } }),
}))

vi.mock('@/entities/automotive-service', () => ({
    ServiceRequestChat: () => null,
    connectAutoCareChat: mocks.connectAutoCareChat,
    useCreateAutoCareChatMessageMutation: () => [mocks.sendMessage, { isLoading: false }],
    useCreateAutoCareChatAttachmentMutation: () => [mocks.createAttachment, { isLoading: false }],
    useCreateAutoCareChatMutation: () => [mocks.createChat, { isLoading: false }],
    useGetAutoCareChatQuery: () => ({
        data: mocks.chatData,
        isLoading: mocks.chatIsLoading,
        isUninitialized: false,
        isFetching: false,
        refetch: mocks.refetch,
    }),
    useGetAutoCareChatsQuery: () => ({
        data: mocks.chats,
        isLoading: false,
        isSuccess: mocks.chatListIsSuccess,
        isError: mocks.chatListIsError,
    }),
    useMarkAutoCareChatReadMutation: () => [mocks.markRead],
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
        mocks.chats = [{ id: 'chat-1', type: 'support', providerId: null, requestId: null, subject: 'Support', unreadCount: 0, updatedAt: '2026-08-30T10:00:00.000Z' }]
        mocks.createChat.mockReset()
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
