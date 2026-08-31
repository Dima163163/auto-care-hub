import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OwnerBroadcastRequestsPanel } from './OwnerBroadcastRequestsPanel'

const createOffer = vi.hoisted(() => vi.fn())

vi.mock('@/entities/automotive-service', () => ({
    useCreateAutoCareBroadcastOfferMutation: () => [createOffer, { isLoading: false, isSuccess: false }],
    useGetOwnerAutoCareBroadcastRequestsQuery: () => ({
        data: [{ id: 'broadcast-1', serviceDefinitionId: 'oil-change', serviceSlug: 'oil-change', issueDescription: 'Нужна замена масла', offers: [] }],
        isLoading: false,
    }),
    useGetOwnerAutoCareProvidersQuery: () => ({
        data: [{ id: 'provider-1', location: { id: 'location-1' }, offers: [{ serviceDefinitionId: 'oil-change', currencyCode: 'RUB' }], locations: [] }],
        isLoading: false,
    }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

describe('OwnerBroadcastRequestsPanel', () => {
    beforeEach(() => {
        createOffer.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Запрос уже закрыт.' } }),
        }))
    })

    it('keeps an offer draft and exposes a retryable error when creation fails', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<OwnerBroadcastRequestsPanel />)
            await user.click(screen.getByRole('button', { name: 'Отправить предложение' }))

            const amount = screen.getByPlaceholderText('Цена предложения, ₽')
            await user.type(amount, '2500')
            await user.click(screen.getByRole('button', { name: 'Отправить предложение' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Запрос уже закрыт.')
            expect(amount).toHaveValue('2500')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
