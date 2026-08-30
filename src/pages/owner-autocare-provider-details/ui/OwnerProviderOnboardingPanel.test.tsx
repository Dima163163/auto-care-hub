import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareApiProvider } from '@/entities/automotive-service'

import { OwnerProviderOnboardingPanel } from './OwnerProviderOnboardingPanel'

const mocks = vi.hoisted(() => ({
    create: vi.fn(() => ({ unwrap: vi.fn().mockRejectedValue(new Error('temporary failure')) })),
    cancel: vi.fn(() => ({ unwrap: vi.fn().mockRejectedValue({ data: { message: 'Request already changed.' } }) })),
    queryData: [{ id: 'change-1', kind: 'verification', status: 'pending', createdAt: '2026-08-29T09:00:00.000Z', reviewReason: null }],
}))

vi.mock('@/entities/automotive-service', () => ({
    useCancelOwnerAutoCareProviderChangeRequestMutation: () => [mocks.cancel, { isLoading: false }],
    useCreateOwnerAutoCareProviderChangeRequestMutation: () => [mocks.create, { isLoading: false, error: null }],
    useGetOwnerAutoCareProviderChangeRequestsQuery: () => ({
        data: mocks.queryData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    }),
}))

vi.mock('./OwnerProviderProfileChangeForm', () => ({
    OwnerProviderProfileChangeForm: () => null,
}))

const provider = {
    id: 'provider-1',
    name: 'ProService',
    description: 'Service',
    phone: '+79990000000',
    location: { id: 'location-1', address: 'Москва, ул. Льва Толстого, 18' },
    coverImageUrl: 'private://cover.webp',
    galleryImageUrls: [],
    offers: [{ id: 'offer-1' }],
    verified: false,
} as AutoCareApiProvider

describe('OwnerProviderOnboardingPanel', () => {
    beforeEach(() => {
        mocks.create.mockClear()
        mocks.cancel.mockClear()
        mocks.queryData = [{ id: 'change-1', kind: 'verification', status: 'pending', createdAt: '2026-08-29T09:00:00.000Z', reviewReason: null }]
    })

    it('surfaces a rejected cancellation without an unhandled rejection', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<OwnerProviderOnboardingPanel provider={provider} locale="ru" />)

            await user.click(screen.getByRole('button', { name: 'Отменить' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Request already changed.')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })

    it('swallows a rejected verification request so the action remains retryable', async () => {
        const user = userEvent.setup()
        mocks.queryData = []
        render(<OwnerProviderOnboardingPanel provider={provider} locale="ru" />)

        await user.click(screen.getByRole('button', { name: 'Отправить на проверку' }))

        expect(mocks.create).toHaveBeenCalledWith({ providerId: 'provider-1', kind: 'verification' })
        expect(screen.getByRole('button', { name: 'Отправить на проверку' })).toBeEnabled()
    })
})
