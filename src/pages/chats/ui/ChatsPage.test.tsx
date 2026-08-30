import { render, screen } from '@testing-library/react'
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
    connectAutoCareChat: vi.fn(() => mocks.cleanup),
    useCreateAutoCareChatMessageMutation: () => [mocks.sendMessage, { isLoading: false }],
    useCreateAutoCareChatAttachmentMutation: () => [mocks.createAttachment, { isLoading: false }],
    useCreateAutoCareChatMutation: () => [mocks.createChat, { isLoading: false }],
    useGetAutoCareChatQuery: () => ({
        data: mocks.chatData,
        isLoading: false,
        isFetching: false,
        refetch: mocks.refetch,
    }),
    useGetAutoCareChatsQuery: () => ({
        data: mocks.chats,
        isLoading: false,
    }),
    useMarkAutoCareChatReadMutation: () => [mocks.markRead],
}))

function renderPage() {
    return render(
        <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: (key: TranslationKey) => key }}>
            <MemoryRouter initialEntries={['/chats']}>
                <ChatsPage />
            </MemoryRouter>
        </I18nContext.Provider>,
    )
}

describe('ChatsPage', () => {
    beforeEach(() => {
        mocks.sendMessage.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue(new Error('temporary failure')),
        }))
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
})
