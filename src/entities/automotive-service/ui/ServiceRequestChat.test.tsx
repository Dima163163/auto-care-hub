import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ServiceRequestChat } from './ServiceRequestChat'

const mocks = vi.hoisted(() => ({
    sendMessage: vi.fn(),
    createOffer: vi.fn(),
    decideOffer: vi.fn(),
    uploadAttachment: vi.fn(),
    markRead: vi.fn(),
    refetch: vi.fn(),
    cleanup: vi.fn(),
    conversationData: {
        thread: { id: 'thread-1', subject: 'Замена масла', clientId: 'client-1' },
        messages: [{
            id: 'message-1',
            senderId: 'owner-1',
            createdAt: '2026-08-30T10:00:00.000Z',
            readAt: null,
            deliveredAt: null,
            body: '',
            kind: 'offer',
            offer: {
                status: 'pending',
                title: 'Скидка на работу',
                description: 'Включает материалы',
                discountPercent: 10,
                couponCode: null,
                amountMinor: null,
                currencyCode: null,
            },
        }],
        attachments: [],
        previousCursor: null,
    },
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetAutoCareServiceConversationQuery: () => ({
        data: mocks.conversationData,
        isLoading: false,
        isFetching: false,
        isError: false,
        error: undefined,
        refetch: mocks.refetch,
    }),
    useMarkAutoCareServiceConversationReadMutation: () => [mocks.markRead],
    useCreateAutoCareServiceMessageMutation: () => [mocks.sendMessage, { isLoading: false }],
    useCreateAutoCareServiceOfferMutation: () => [mocks.createOffer, { isLoading: false }],
    useDecideAutoCareServiceOfferMutation: () => [mocks.decideOffer, { isLoading: false }],
    useCreateAutoCareServiceAttachmentMutation: () => [mocks.uploadAttachment, { isLoading: false }],
}))

vi.mock('@/entities/automotive-service/lib/service-chat', () => ({
    connectServiceChat: () => mocks.cleanup,
}))

vi.mock('@/entities/automotive-service/lib/chat-attachment', () => ({
    validateChatAttachment: () => ({ valid: false }),
}))

vi.mock('@/entities/automotive-service/lib/chat-offer-validation', () => ({
    validateChatOffer: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { id: 'client-1', role: 'client' } }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

describe('ServiceRequestChat', () => {
    beforeEach(() => {
        mocks.markRead.mockReset()
        mocks.refetch.mockReset()
        mocks.cleanup.mockReset()
        mocks.sendMessage.mockReset()
        mocks.createOffer.mockReset()
        mocks.uploadAttachment.mockReset()
        mocks.decideOffer.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Предложение уже закрыто.' } }),
        }))
    })

    it('keeps offer actions retryable when the decision API rejects', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<ServiceRequestChat requestId="request-1" />)
            await user.click(screen.getByRole('button', { name: 'autocare.chatOfferAccept' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Предложение уже закрыто.')
            expect(mocks.decideOffer).toHaveBeenCalledWith({ requestId: 'request-1', messageId: 'message-1', decision: 'accept' })
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
