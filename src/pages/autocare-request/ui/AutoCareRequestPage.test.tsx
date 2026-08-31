import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequestFollowUp } from './AutoCareRequestPage'

const mocks = vi.hoisted(() => ({
    acceptQuote: vi.fn(),
    declineQuote: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    ServiceRequestChat: () => null,
    useAcceptAutoCareServiceQuoteMutation: () => [mocks.acceptQuote, { isLoading: false }],
    useDeclineAutoCareServiceQuoteMutation: () => [mocks.declineQuote, { isLoading: false }],
    useGetAutoCareRepairTimelineQuery: () => ({ data: [] }),
    useGetAutoCareServiceConversationQuery: () => ({
        data: {
            request: {
                status: 'estimate_shared',
                quote: {
                    amountMinor: 250000,
                    currencyCode: 'RUB',
                    lineItems: [],
                    note: null,
                    status: 'pending',
                },
            },
        },
    }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'autocare.requestSubmittedTitle': 'Заявка отправлена',
            'autocare.requestSubmittedDescription': 'Сервис получил вашу заявку.',
            'autocare.requestBackToProfile': 'Вернуться в профиль',
            'autocare.clientServiceRequestsQuote': 'Предварительная смета',
            'autocare.clientServiceRequestsAcceptQuote': 'Принять смету',
            'autocare.clientServiceRequestsDeclineQuote': 'Отклонить',
            'autocare.clientServiceRequestsQuoteError': 'Не удалось обработать смету.',
        }[key] ?? key),
    }),
}))

vi.mock('./GuaranteeClaimCard', () => ({
    GuaranteeClaimCard: () => null,
}))

describe('RequestFollowUp', () => {
    beforeEach(() => {
        mocks.acceptQuote.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Смета уже обработана.' } }),
        }))
        mocks.declineQuote.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Статус сметы изменился.' } }),
        }))
    })

    it('keeps quote actions retryable when the server rejects a decision', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(
                <MemoryRouter>
                    <RequestFollowUp providerId="provider-1" requestId="request-1" />
                </MemoryRouter>,
            )

            await user.click(screen.getByRole('button', { name: 'Принять смету' }))
            expect(await screen.findByRole('alert')).toHaveTextContent('Смета уже обработана.')
            expect(screen.getByRole('button', { name: 'Принять смету' })).toBeEnabled()

            await user.click(screen.getByRole('button', { name: 'Отклонить' }))
            expect(await screen.findByRole('alert')).toHaveTextContent('Статус сметы изменился.')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
