import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nContext } from '@/shared/lib/i18n-context'

import { AutoCareReviewResolutionPanel } from './AutoCareReviewResolutionPanel'

const mocks = vi.hoisted(() => ({
    reviews: vi.fn(),
    redeem: vi.fn(),
    update: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetMyAutoCareReviewsQuery: () => mocks.reviews(),
    useRedeemAutoCareReviewPromoMutation: () => [mocks.redeem, { isLoading: false }],
    useUpdateAutoCareReviewMutation: () => [mocks.update, { isLoading: false }],
}))

function renderPanel() {
    return render(
        <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: (key) => key }}>
            <AutoCareReviewResolutionPanel />
        </I18nContext.Provider>,
    )
}

const review = {
    id: 'review-1',
    authorName: 'Alex Driver',
    vehicleLabel: 'Toyota Corolla',
    rating: 4,
    text: 'The service solved the issue quickly.',
    canEdit: true,
}

describe('AutoCareReviewResolutionPanel', () => {
    beforeEach(() => {
        mocks.reviews.mockReset().mockReturnValue({ data: [review], isLoading: false, isError: false, refetch: vi.fn() })
        mocks.redeem.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        mocks.update.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
    })

    it('redeems a service resolution code and updates an eligible review once', async () => {
        const user = userEvent.setup()
        renderPanel()

        await user.type(screen.getByRole('textbox', { name: 'Promo code' }), 'care-12345678')
        await user.click(screen.getByRole('button', { name: 'Redeem code' }))

        expect(mocks.redeem).toHaveBeenCalledWith({ code: 'CARE-12345678' })
        expect(await screen.findByText('Code accepted. You can now update the review once.')).toBeVisible()

        await user.click(screen.getByRole('button', { name: 'Update review' }))
        const text = screen.getByRole('textbox', { name: 'Review text' })
        await user.clear(text)
        await user.type(text, 'The service followed up and resolved everything.')
        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(mocks.update).toHaveBeenCalledWith({
            reviewId: 'review-1',
            rating: 4,
            text: 'The service followed up and resolved everything.',
        })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('keeps a retryable error state when reviews cannot be loaded', () => {
        const refetch = vi.fn()
        mocks.reviews.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { status: 503 }, refetch })
        renderPanel()

        expect(screen.getByRole('alert')).toHaveAttribute('data-state', 'error')
        expect(screen.getByRole('button', { name: 'common.retry' })).toBeVisible()
    })

    it('does not render a resolution editor before review data is available', () => {
        mocks.reviews.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() })
        renderPanel()

        expect(screen.queryByRole('button', { name: 'Update review' })).not.toBeInTheDocument()
        expect(screen.getByLabelText('Loading reviews')).toBeVisible()
    })
})
