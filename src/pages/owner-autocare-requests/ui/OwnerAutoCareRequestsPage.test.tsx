import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import type { AutoCareServiceRequest } from '@/entities/automotive-service'
import type { TranslationKey } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { OwnerAutoCareRequestsPage } from './OwnerAutoCareRequestsPage'

const mocks = vi.hoisted(() => {
    const rejectedTrigger = vi.fn(() => ({ unwrap: vi.fn().mockRejectedValue(new Error('temporary failure')) }))
    return {
        rejectedTrigger,
        confirm: vi.fn(() => Promise.resolve({ error: { status: 503, data: { message: 'temporary failure' } } })),
        request: {
            id: 'request-1',
            status: 'accepted',
            preferredAt: '2026-08-30T12:00:00.000Z',
            providerConfirmedAt: '2026-08-29T12:00:00.000Z',
            clientConfirmedAt: '2026-08-29T12:00:00.000Z',
            locationId: 'location-1',
            providerName: 'ProService',
            address: 'Москва, ул. Льва Толстого, 18',
            serviceSlug: 'oil-change',
            serviceLabels: { ru: 'Замена масла' },
            contactSnapshot: { name: 'Клиент', phone: '+79990000000' },
            vehicleSnapshot: { make: 'Toyota', model: 'Camry', year: 2020 },
            note: 'Проверить тормоза',
            createdAt: '2026-08-29T09:00:00.000Z',
            priceFromMinor: null,
            currencyCode: 'RUB',
            quote: null,
            booking: null,
            reschedule: null,
        } as unknown as AutoCareServiceRequest,
    }
})

vi.mock('@/entities/automotive-service', () => ({
    useCompleteAutoCareServiceRequestMutation: () => [mocks.rejectedTrigger, { isLoading: false, error: { status: 503 } }],
    useConfirmOwnerAutoCareServiceRequestMutation: () => [mocks.confirm, { isLoading: false, error: { status: 503 } }],
    useCreateAutoCareServiceQuoteMutation: () => [mocks.rejectedTrigger, { isLoading: false, error: { status: 503 } }],
    useGetOwnerAutoCareProvidersQuery: () => ({
        data: [{ id: 'provider-1', name: 'ProService', locations: [{ location: { id: 'location-1', address: 'Москва, ул. Льва Толстого, 18', appointmentCapacity: 2 }, offers: [] }] }],
        isLoading: false,
        isError: false,
    }),
    useGetOwnerAutoCareServiceRequestsQuery: () => ({ data: [mocks.request], isLoading: false, error: null }),
    useMarkAutoCareServiceRequestNoShowMutation: () => [mocks.rejectedTrigger, { isLoading: false, error: { status: 503 } }],
    useRequestAutoCareServiceRescheduleMutation: () => [mocks.rejectedTrigger, { isLoading: false, error: { status: 503 } }],
}))

function renderPage() {
    return render(
        <I18nContext.Provider value={{ locale: 'ru', setLocale: vi.fn(), t: (key: TranslationKey) => key }}>
            <MemoryRouter initialEntries={['/owner/autocare-requests']}>
                <OwnerAutoCareRequestsPage />
            </MemoryRouter>
        </I18nContext.Provider>,
    )
}

describe('OwnerAutoCareRequestsPage', () => {
    beforeEach(() => {
        mocks.rejectedTrigger.mockClear()
        mocks.confirm.mockClear()
    })

    it('swallows rejected owner actions so retryable API errors do not become unhandled rejections', async () => {
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            const user = userEvent.setup()
            renderPage()

            await user.type(screen.getByLabelText('autocare.ownerRequestsAmountPlaceholder'), '2500')
            await user.click(screen.getByRole('button', { name: 'autocare.ownerRequestsSendQuote' }))

            const reschedule = screen.getByLabelText('autocare.ownerRequestsRescheduleDate')
            await user.type(reschedule, '2026-08-31T12:00')
            await user.click(screen.getByRole('button', { name: 'autocare.ownerRequestsRescheduleSend' }))
            await user.click(screen.getByRole('button', { name: 'autocare.ownerRequestsNoShow' }))
            await user.click(screen.getByRole('button', { name: 'autocare.ownerRequestsComplete' }))

            await new Promise((resolve) => setTimeout(resolve, 0))
            expect(unhandled).toEqual([])
            expect(screen.getByDisplayValue('2500')).toBeInTheDocument()
            expect(reschedule).toHaveValue('2026-08-31T12:00')
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
