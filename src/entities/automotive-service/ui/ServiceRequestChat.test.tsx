import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ServiceRequestChat } from './ServiceRequestChat'

const mocks = vi.hoisted(() => ({
    sendMessage: vi.fn(),
    createOffer: vi.fn(),
    decideOffer: vi.fn(),
    uploadAttachment: vi.fn(),
    createReport: vi.fn(),
    deleteMessage: vi.fn(),
    markRead: vi.fn(),
    refetch: vi.fn(),
    cleanup: vi.fn(),
    getAttachmentObjectUrl: vi.fn(),
    attachmentError: false,
    refetchAttachment: vi.fn(),
    viewer: { id: 'client-1', role: 'client' as 'client' | 'owner' },
    ownReports: [] as Array<{ id: string; messageId: string; status: 'pending' | 'resolved' | 'dismissed'; assignedModeratorId: string | null }>,
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
        moderationReviewActive: false,
        messagesProtected: false,
    },
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetAutoCareRequestChatThreadQuery: () => ({ data: { id: 'chat-request-request-1' }, isLoading: false }),
    useGetMyAutoCareChatReportsQuery: () => ({ data: { items: mocks.ownReports, nextCursor: null, totalCount: mocks.ownReports.length }, isLoading: false }),
    useLazyGetMyAutoCareChatReportsQuery: () => [vi.fn(), { isFetching: false }],
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
    useCreateAutoCareChatReportMutation: () => [mocks.createReport, { isLoading: false }],
    useDeleteAutoCareChatMessageMutation: () => [mocks.deleteMessage, { isLoading: false }],
    useGetAutoCareAttachmentObjectUrlQuery: (input: unknown) => {
        mocks.getAttachmentObjectUrl(input)
        return { data: mocks.attachmentError ? undefined : 'blob:private-attachment', isLoading: false, isError: mocks.attachmentError, refetch: mocks.refetchAttachment }
    },
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
    useGetMeQuery: () => ({ data: mocks.viewer }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

describe('ServiceRequestChat', () => {
    beforeEach(() => {
        mocks.viewer = { id: 'client-1', role: 'client' }
        mocks.markRead.mockReset()
        mocks.conversationData.messages = [{ id: 'message-1', senderId: 'owner-1', kind: 'offer', createdAt: '2026-08-30T10:00:00.000Z', readAt: null, deliveredAt: null, body: '', offer: { status: 'pending', title: 'Скидка на работу', description: 'Включает материалы', discountPercent: 10, couponCode: null, amountMinor: null, currencyCode: null } }]
        mocks.ownReports = []
        mocks.conversationData.moderationReviewActive = false
        mocks.conversationData.messagesProtected = false
        mocks.refetch.mockReset()
        mocks.cleanup.mockReset()
        mocks.sendMessage.mockReset()
        mocks.createOffer.mockReset()
        mocks.uploadAttachment.mockReset()
        mocks.createReport.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        mocks.deleteMessage.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ id: 'message-action', deletedAt: new Date().toISOString() }) }))
        mocks.getAttachmentObjectUrl.mockReset()
        mocks.attachmentError = false
        mocks.refetchAttachment.mockReset()
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

    it('loads private attachments through the authenticated API query', async () => {
        mocks.conversationData.attachments = [{ id: 'attachment-1', url: '/private/attachment' }] as never
        const user = userEvent.setup()
        render(<ServiceRequestChat requestId="request-private" />)

        const attachment = await screen.findByTestId('service-request-attachment')
        expect(mocks.getAttachmentObjectUrl).toHaveBeenCalledWith({ channel: 'request', requestId: 'request-private', attachmentId: 'attachment-1' })
        await user.click(attachment)
        expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute('src', 'blob:private-attachment')
        mocks.conversationData.attachments = []
    })

    it('exposes a private-image load failure and lets the user retry', async () => {
        mocks.attachmentError = true
        mocks.conversationData.attachments = [{ id: 'attachment-error', url: '/private/attachment' }] as never
        const user = userEvent.setup()
        render(<ServiceRequestChat requestId="request-private" />)

        const retry = await screen.findByRole('button', { name: 'autocare.chatAttachmentView: common.tryAgainLater' })
        expect(retry).toHaveAttribute('aria-invalid', 'true')
        await user.click(retry)
        expect(mocks.refetchAttachment).toHaveBeenCalledTimes(1)
        mocks.conversationData.attachments = []
        mocks.attachmentError = false
    })

    it('opens message actions with Shift+F10 and sends no report when consent is cancelled', async () => {
        const user = userEvent.setup()
        mocks.conversationData.messages = [{ id: 'message-reportable', senderId: 'owner-1', kind: 'text', createdAt: new Date().toISOString(), readAt: null, deliveredAt: null, body: 'Please report this message', offer: null }] as never
        render(<ServiceRequestChat requestId="request-report" />)

        const actionButton = screen.getByRole('button', { name: 'autocare.chatMessageActions' })
        actionButton.focus()
        await user.keyboard('{Shift>}{F10}{/Shift}')
        await user.click(await screen.findByText('autocare.chatReportAction'))

        expect(screen.getByRole('heading', { name: 'autocare.chatReportConfirmTitle' })).toBeVisible()
        expect(screen.getByText('autocare.chatReportConfirmDescription')).toBeVisible()
        await user.click(screen.getByRole('button', { name: 'common.cancel' }))
        expect(mocks.createReport).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'autocare.chatMessageActions' }))
        await user.click(await screen.findByText('autocare.chatReportAction'))
        await user.click(screen.getByRole('button', { name: 'autocare.chatReportConfirmSubmit' }))
        expect(mocks.createReport).toHaveBeenCalledWith({ chatId: 'chat-request-request-1', messageId: 'message-reportable', category: 'harassment', description: null, acknowledgeFullThreadReview: true })
    })

    it('keeps copy and local hide while an open report blocks deletion and another report', async () => {
        const user = userEvent.setup()
        mocks.ownReports = [{ id: 'report-1', messageId: 'reported-message', status: 'pending', assignedModeratorId: null }]
        mocks.conversationData.messages = [
            { id: 'own-message', senderId: 'client-1', kind: 'text', createdAt: new Date().toISOString(), readAt: null, deliveredAt: null, body: 'My message', offer: null },
            { id: 'other-message', senderId: 'owner-1', kind: 'text', createdAt: new Date().toISOString(), readAt: null, deliveredAt: null, body: 'Service message', offer: null },
        ] as never
        render(<ServiceRequestChat requestId="request-report-pending" />)

        expect(screen.getByRole('status')).toHaveTextContent('autocare.chatReportPendingActionsNotice')
        const ownMessage = screen.getByText('My message').closest('article')
        const otherMessage = screen.getByText('Service message').closest('article')
        expect(ownMessage).not.toBeNull()
        expect(otherMessage).not.toBeNull()
        await user.click(within(ownMessage!).getByRole('button', { name: 'autocare.chatMessageActions' }))
        expect(await screen.findByText('autocare.chatHideForMe')).toBeVisible()
        expect(screen.queryByText('autocare.chatDeleteForEveryone')).not.toBeInTheDocument()
        await user.click(within(otherMessage!).getByRole('button', { name: 'autocare.chatMessageActions' }))
        expect(await screen.findByText('autocare.chatCopy')).toBeVisible()
        expect(screen.queryByText('autocare.chatReportAction')).not.toBeInTheDocument()
    })

    it('uses the conversation review state for the reported participant even without own report history', async () => {
        const user = userEvent.setup()
        const now = new Date().toISOString()
        mocks.viewer = { id: 'owner-1', role: 'owner' }
        mocks.ownReports = []
        mocks.conversationData.moderationReviewActive = true
        mocks.conversationData.messagesProtected = true
        mocks.conversationData.messages = [
            { id: 'owner-message', senderId: 'owner-1', kind: 'text', createdAt: now, readAt: null, deliveredAt: null, body: 'QA test message', offer: null },
            { id: 'client-message', senderId: 'client-1', kind: 'text', createdAt: now, readAt: null, deliveredAt: null, body: 'Client message', offer: null },
        ] as never

        render(<ServiceRequestChat requestId="request-under-review" ownerMode />)

        expect(await screen.findByRole('status')).toHaveTextContent('autocare.chatReportPendingActionsNotice')
        const ownMessage = screen.getByText('QA test message').closest('article')
        const otherMessage = screen.getByText('Client message').closest('article')
        expect(ownMessage).not.toBeNull()
        expect(otherMessage).not.toBeNull()
        await user.click(within(ownMessage!).getByRole('button', { name: 'autocare.chatMessageActions' }))
        expect(await screen.findByText('autocare.chatHideForMe')).toBeVisible()
        expect(screen.queryByText('autocare.chatDeleteForEveryone')).not.toBeInTheDocument()
        await user.click(within(otherMessage!).getByRole('button', { name: 'autocare.chatMessageActions' }))
        expect(await screen.findByText('autocare.chatCopy')).toBeVisible()
        expect(screen.queryByText('autocare.chatReportAction')).not.toBeInTheDocument()
    })
})
