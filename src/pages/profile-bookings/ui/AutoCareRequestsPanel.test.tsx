import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareServiceRequest } from '@/entities/automotive-service'

import { AutoCareRequestsPanel } from './AutoCareRequestsPanel'

const mocks = vi.hoisted(() => ({
    acceptQuote: vi.fn(),
    declineQuote: vi.fn(),
    decideReschedule: vi.fn(),
}))

const request = {
    id: 'request-1',
    providerId: 'provider-1',
    status: 'estimate_shared',
    preferredAt: '2026-08-30T12:00:00.000Z',
    providerName: 'ProService',
    serviceLabels: { ru: 'Замена масла' },
    serviceSlug: 'oil-change',
    priceFromMinor: null,
    currencyCode: 'RUB',
    quote: { amountMinor: 250000, currencyCode: 'RUB', status: 'pending', lineItems: [], note: null },
    quoteHistory: [],
    booking: null,
    reschedule: { status: 'pending', proposedAt: '2026-09-01T12:00:00.000Z', reason: null },
} as unknown as AutoCareServiceRequest

vi.mock('@/entities/automotive-service', () => ({
    ServiceRequestChat: () => null,
    useAcceptAutoCareServiceQuoteMutation: () => [mocks.acceptQuote, { isLoading: false }],
    useCancelAutoCareServiceRequestMutation: () => [vi.fn(), { isLoading: false, error: null }],
    useCreateAutoCareReviewMutation: () => [vi.fn(), { isLoading: false, isError: false }],
    useDecideAutoCareServiceRescheduleMutation: () => [mocks.decideReschedule, { isLoading: false, error: null }],
    useDeclineAutoCareServiceQuoteMutation: () => [mocks.declineQuote, { isLoading: false }],
    useGetMyAutoCareBonusAccountsQuery: () => ({ data: [], isLoading: false, error: null }),
    useGetMyAutoCareServiceRequestsQuery: () => ({ data: [request], isLoading: false, isFetching: false, isError: false, error: null, refetch: vi.fn() }),
    useRedeemAutoCareBonusMutation: () => [vi.fn(), { isLoading: false, error: null }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'autocare.clientServiceRequestsOpen': 'Открыть переписку',
            'autocare.clientServiceRequestsQuote': 'Предварительная смета',
            'autocare.clientServiceRequestsAcceptQuote': 'Принять смету',
            'autocare.clientServiceRequestsDeclineQuote': 'Отклонить',
            'autocare.clientServiceRequestsQuoteError': 'Не удалось обработать смету.',
            'autocare.clientServiceRequestsReschedule': 'Сервис предложил новое время',
            'autocare.clientServiceRequestsRescheduleAccept': 'Принять новое время',
            'autocare.clientServiceRequestsRescheduleReject': 'Отклонить новое время',
            'autocare.clientServiceRequestsRescheduleError': 'Не удалось изменить время визита.',
        }[key] ?? key),
    }),
}))

describe('AutoCareRequestsPanel quote decisions', () => {
    beforeEach(() => {
        mocks.acceptQuote.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Смета уже обработана.' } }),
        }))
        mocks.declineQuote.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Статус сметы изменился.' } }),
        }))
        mocks.decideReschedule.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Время визита уже изменилось.' } }),
        }))
    })

    it('keeps quote actions retryable when a profile request decision fails', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<AutoCareRequestsPanel />)
            await user.click(screen.getByRole('button', { name: /Открыть переписку/ }))
            await user.click(screen.getByRole('button', { name: 'Принять смету' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Смета уже обработана.')
            expect(screen.getByRole('button', { name: 'Принять смету' })).toBeEnabled()

            await user.click(screen.getByRole('button', { name: 'Отклонить' }))
            expect(await screen.findByRole('alert')).toHaveTextContent('Статус сметы изменился.')

            await user.click(screen.getByRole('button', { name: 'Принять новое время' }))
            expect(await screen.findByRole('alert')).toHaveTextContent('Время визита уже изменилось.')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
